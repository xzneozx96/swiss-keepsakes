import type { OpenAPIHono } from '@hono/zod-openapi'
import type { Pin, PinStoryOption } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { AppEnv } from '../../../platform/http/app.ts'
import type { Result } from '../application/failure.ts'
import type { PinListResult } from '../application/list-pins.ts'
import type { MerchantPinEntry, PinChanges, PinListQuery, PinStoryOptionsQuery } from '../ports.ts'
import { createRoute, z } from '@hono/zod-openapi'
import { pinListQuerySchema, pinListSchema, pinLookupQuerySchema, pinLookupSchema, pinPublishBodySchema, pinSchema, pinStoryOptionListSchema, pinStoryOptionsQuerySchema, pinWriteBodySchema } from '@sk/api-contract'
import { problem } from '../../../platform/http/problem.ts'
import { problemResponses, requestIdHeader } from '../../../platform/http/responses.ts'
import { limitWholeList } from '../../../platform/http/whole-list-limits.ts'
import { wholeIfNoPage } from '../../../platform/http/whole-list.ts'
import { readIfMatch } from './if-match.ts'
import { pinChanges, pinListItemView, pinView } from './pin-view.ts'
import { failureProblem } from './problems.ts'
import { acceptEmptyBody, etag, etagHeaders, json, storeParams, withIfMatch } from './route-parts.ts'

// What the pin routes call. main.ts builds each from the module's use cases, wrapped by guardUseCases.
export interface PinUseCases {
  publicUrl: (key: string) => string
  listMerchantPins: (actor: Actor, storeId: string, query: PinListQuery) => Promise<Result<PinListResult>>
  getMerchantPin: (actor: Actor, storeId: string, pinId: string) => Promise<Result<Pin>>
  listPinsByIds: (actor: Actor, storeId: string, query: { ids: string[], host?: string | undefined }) => Promise<Result<MerchantPinEntry[]>>
  listPinStoryOptions: (actor: Actor, storeId: string, query: PinStoryOptionsQuery) => Promise<Result<PinStoryOption[]>>
  createPin: (actor: Actor, storeId: string, changes: PinChanges, requestId: string | null) => Promise<Result<Pin>>
  savePin: (actor: Actor, storeId: string, pinId: string, ifMatch: number, changes: PinChanges, requestId: string | null) => Promise<Result<Pin>>
  publishPin: (actor: Actor, storeId: string, pinId: string, ifMatch: number, requestId: string | null) => Promise<Result<Pin>>
  hidePin: (actor: Actor, storeId: string, pinId: string, ifMatch: number, requestId: string | null) => Promise<Result<Pin>>
  deletePin: (actor: Actor, storeId: string, pinId: string, ifMatch: number, requestId: string | null) => Promise<Result<{ id: string }>>
}

const pinParams = z.object({ storeId: z.uuid(), pinId: z.uuid() })

const listPinsRoute = createRoute({
  method: 'get',
  path: '/api/store/{storeId}/pins',
  request: { params: storeParams, query: pinListQuerySchema },
  responses: { 200: { description: 'One page of the pins of the store, with the total and the facet counts. `ended` is a live pin whose dates are all over', headers: requestIdHeader, content: json(pinListSchema) }, ...problemResponses },
})

// Registered before the {pinId} routes, so `story-options` is never read as a pin id.
const storyOptionsRoute = createRoute({
  method: 'get',
  path: '/api/store/{storeId}/pins/story-options',
  request: { params: storeParams, query: pinStoryOptionsQuerySchema },
  responses: { 200: { description: 'The story groups of the store that match the search, for the main-story picker', headers: requestIdHeader, content: json(pinStoryOptionListSchema) }, ...problemResponses },
})

// Registered before the {pinId} routes, so `lookup` is never read as a pin id.
const lookupPinsRoute = createRoute({
  method: 'get',
  path: '/api/store/{storeId}/pins/lookup',
  request: { params: storeParams, query: pinLookupQuerySchema },
  responses: { 200: { description: 'The pins named by `ids` (at most 50) and, with `host`, the published pins linking to that host. Not paged', headers: requestIdHeader, content: json(pinLookupSchema) }, ...problemResponses },
})

const getPinRoute = createRoute({
  method: 'get',
  path: '/api/store/{storeId}/pins/{pinId}',
  request: { params: pinParams },
  responses: { 200: { description: 'The pin with its draft, photos and outbound link', headers: etagHeaders, content: json(pinSchema) }, ...problemResponses },
})

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
    204: { description: 'The pin is deleted, whatever its status, when no story, review or tour uses it', headers: requestIdHeader },
    ...problemResponses,
  },
})

// The Idempotency-Key middleware and the store guard sit before these (createApp), so the handlers read the
// verified store from `c.get('store')`, never from the path.
export function registerPinRoutes(app: OpenAPIHono<AppEnv>, useCases: PinUseCases): void {
  app.openapi(listPinsRoute, async (c) => {
    const result = await useCases.listMerchantPins(c.get('actor'), c.get('store').storeId, wholeIfNoPage(c, c.req.valid('query')))
    if (!result.ok)
      return problem(c, failureProblem(result))
    const { entries, ...page } = result.value
    return c.json({ ...page, items: entries.map(entry => pinListItemView(entry, useCases.publicUrl)) }, 200)
  })

  app.openapi(lookupPinsRoute, async (c) => {
    const result = await useCases.listPinsByIds(c.get('actor'), c.get('store').storeId, c.req.valid('query'))
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(limitWholeList(c, 'GET /api/store/{storeId}/pins/lookup', { items: result.value.map(entry => pinListItemView(entry, useCases.publicUrl)) }), 200)
  })

  app.openapi(storyOptionsRoute, async (c) => {
    const result = await useCases.listPinStoryOptions(c.get('actor'), c.get('store').storeId, c.req.valid('query'))
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(limitWholeList(c, 'GET /api/store/{storeId}/pins/story-options', { items: result.value }), 200)
  })

  app.openapi(getPinRoute, async (c) => {
    const result = await useCases.getMerchantPin(c.get('actor'), c.get('store').storeId, c.req.valid('param').pinId)
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(pinView(result.value), 200, etag(result.value))
  })

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
    const result = await useCases.publishPin(c.get('actor'), c.get('store').storeId, c.req.valid('param').pinId, ifMatch.version, c.get('requestId'))
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
