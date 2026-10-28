import type { OpenAPIHono } from '@hono/zod-openapi'
import type { Localized, Pin } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { AppEnv } from '../../../platform/http/app.ts'
import type { Result } from '../application/failure.ts'
import type { PinChanges } from '../ports.ts'
import { createRoute, z } from '@hono/zod-openapi'
import { pinPublishBodySchema, pinSchema, pinWriteBodySchema } from '@sk/api-contract'
import { problem } from '../../../platform/http/problem.ts'
import { problemResponses, requestIdHeader } from '../../../platform/http/responses.ts'
import { readIfMatch } from './if-match.ts'
import { pinChanges, pinView } from './pin-view.ts'
import { failureProblem } from './problems.ts'
import { acceptEmptyBody, etag, etagHeaders, json, storeParams, withIfMatch } from './route-parts.ts'

// What the pin routes call. main.ts builds each from the module's use cases, wrapped by guardUseCases.
export interface PinUseCases {
  createPin: (actor: Actor, storeId: string, changes: PinChanges, requestId: string | null) => Promise<Result<Pin>>
  savePin: (actor: Actor, storeId: string, pinId: string, ifMatch: number, changes: PinChanges, requestId: string | null) => Promise<Result<Pin>>
  publishPin: (actor: Actor, storeId: string, pinId: string, ifMatch: number, requestId: string | null, slug?: Localized) => Promise<Result<Pin>>
  hidePin: (actor: Actor, storeId: string, pinId: string, ifMatch: number, requestId: string | null) => Promise<Result<Pin>>
  deletePin: (actor: Actor, storeId: string, pinId: string, ifMatch: number, requestId: string | null) => Promise<Result<{ id: string }>>
}

const pinParams = z.object({ storeId: z.uuid(), pinId: z.uuid() })

const createPinRoute = createRoute({
  method: 'post',
  path: '/api/store/{storeId}/pins',
  request: { params: storeParams, body: { required: true, content: json(pinWriteBodySchema) } },
  responses: {
    201: { description: 'The new draft pin', headers: etagHeaders, content: json(pinSchema) },
    ...problemResponses,
  },
})

const savePinRoute = createRoute({
  method: 'patch',
  path: '/api/store/{storeId}/pins/{pinId}',
  request: { params: pinParams, ...withIfMatch, body: { required: true, content: json(pinWriteBodySchema) } },
  responses: {
    200: { description: 'The pin with the change saved. A left-out field stays, null clears, a list replaces', headers: etagHeaders, content: json(pinSchema) },
    ...problemResponses,
  },
})

const publishPinRoute = createRoute({
  method: 'post',
  path: '/api/store/{storeId}/pins/{pinId}/publish',
  middleware: [acceptEmptyBody],
  request: { params: pinParams, ...withIfMatch, body: { required: false, content: json(pinPublishBodySchema) } },
  responses: {
    200: { description: 'The pin is live with its draft', headers: etagHeaders, content: json(pinSchema) },
    ...problemResponses,
  },
})

const hidePinRoute = createRoute({
  method: 'post',
  path: '/api/store/{storeId}/pins/{pinId}/hide',
  request: { params: pinParams, ...withIfMatch },
  responses: {
    200: { description: 'The pin is hidden. Its published text is kept', headers: etagHeaders, content: json(pinSchema) },
    ...problemResponses,
  },
})

const deletePinRoute = createRoute({
  method: 'delete',
  path: '/api/store/{storeId}/pins/{pinId}',
  request: { params: pinParams, ...withIfMatch },
  responses: {
    204: { description: 'The pin is deleted. Only a pin that was never published can be', headers: requestIdHeader },
    ...problemResponses,
  },
})

// The Idempotency-Key middleware and the store guard sit before these (createApp), so the handlers read the
// verified store from `c.get('store')`, never from the path.
export function registerPinRoutes(app: OpenAPIHono<AppEnv>, useCases: PinUseCases): void {
  app.openapi(createPinRoute, async (c) => {
    const result = await useCases.createPin(c.get('actor'), c.get('store').storeId, pinChanges(c.req.valid('json')), c.get('requestId'))
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(pinView(result.value), 201, etag(result.value))
  })

  app.openapi(savePinRoute, async (c) => {
    const ifMatch = readIfMatch(c)
    if (!ifMatch.ok)
      return ifMatch.response
    const result = await useCases.savePin(c.get('actor'), c.get('store').storeId, c.req.valid('param').pinId, ifMatch.version, pinChanges(c.req.valid('json')), c.get('requestId'))
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(pinView(result.value), 200, etag(result.value))
  })

  app.openapi(publishPinRoute, async (c) => {
    const ifMatch = readIfMatch(c)
    if (!ifMatch.ok)
      return ifMatch.response
    const result = await useCases.publishPin(c.get('actor'), c.get('store').storeId, c.req.valid('param').pinId, ifMatch.version, c.get('requestId'), c.req.valid('json').slug)
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(pinView(result.value), 200, etag(result.value))
  })

  app.openapi(hidePinRoute, async (c) => {
    const ifMatch = readIfMatch(c)
    if (!ifMatch.ok)
      return ifMatch.response
    const result = await useCases.hidePin(c.get('actor'), c.get('store').storeId, c.req.valid('param').pinId, ifMatch.version, c.get('requestId'))
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(pinView(result.value), 200, etag(result.value))
  })

  app.openapi(deletePinRoute, async (c) => {
    const ifMatch = readIfMatch(c)
    if (!ifMatch.ok)
      return ifMatch.response
    const result = await useCases.deletePin(c.get('actor'), c.get('store').storeId, c.req.valid('param').pinId, ifMatch.version, c.get('requestId'))
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.body(null, 204)
  })
}
