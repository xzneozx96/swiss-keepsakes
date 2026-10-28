import type { OpenAPIHono } from '@hono/zod-openapi'
import type { TourGuide } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { AppEnv } from '../../../platform/http/app.ts'
import type { Result } from '../application/failure.ts'
import type { TourChanges } from '../ports.ts'
import { createRoute, z } from '@hono/zod-openapi'
import { tourSchema, tourWriteBodySchema } from '@sk/api-contract'
import { problem } from '../../../platform/http/problem.ts'
import { problemResponses, requestIdHeader } from '../../../platform/http/responses.ts'
import { readIfMatch } from './if-match.ts'
import { failureProblem } from './problems.ts'
import { etag, etagHeaders, json, storeParams, withIfMatch } from './route-parts.ts'
import { tourChanges, tourView } from './tour-view.ts'

// What the tour routes call. main.ts builds each from the module's use cases, wrapped by guardUseCases.
export interface TourUseCases {
  createTour: (actor: Actor, storeId: string, changes: TourChanges, requestId: string | null) => Promise<Result<TourGuide>>
  saveTour: (actor: Actor, storeId: string, tourId: string, ifMatch: number, changes: TourChanges, requestId: string | null) => Promise<Result<TourGuide>>
  publishTour: (actor: Actor, storeId: string, tourId: string, ifMatch: number, requestId: string | null) => Promise<Result<TourGuide>>
  unpublishTour: (actor: Actor, storeId: string, tourId: string, ifMatch: number, requestId: string | null) => Promise<Result<TourGuide>>
  deleteTour: (actor: Actor, storeId: string, tourId: string, requestId: string | null) => Promise<Result<{ id: string }>>
}

const tourParams = z.object({ storeId: z.uuid(), tourId: z.uuid() })

const createTourRoute = createRoute({
  method: 'post',
  path: '/api/store/{storeId}/tours',
  request: { params: storeParams, body: { required: true, content: json(tourWriteBodySchema) } },
  responses: {
    201: { description: 'The new draft tour guide', headers: etagHeaders, content: json(tourSchema) },
    ...problemResponses,
  },
})

const saveTourRoute = createRoute({
  method: 'patch',
  path: '/api/store/{storeId}/tours/{tourId}',
  request: { params: tourParams, ...withIfMatch, body: { required: true, content: json(tourWriteBodySchema) } },
  responses: {
    200: { description: 'The tour guide with the change saved. A left-out field stays, null clears, a list replaces', headers: etagHeaders, content: json(tourSchema) },
    ...problemResponses,
  },
})

const publishTourRoute = createRoute({
  method: 'post',
  path: '/api/store/{storeId}/tours/{tourId}/publish',
  request: { params: tourParams, ...withIfMatch },
  responses: {
    200: { description: 'The tour guide is live with its draft', headers: etagHeaders, content: json(tourSchema) },
    ...problemResponses,
  },
})

const unpublishTourRoute = createRoute({
  method: 'post',
  path: '/api/store/{storeId}/tours/{tourId}/unpublish',
  request: { params: tourParams, ...withIfMatch },
  responses: {
    200: { description: 'The tour guide is a draft again. Its published text is kept', headers: etagHeaders, content: json(tourSchema) },
    ...problemResponses,
  },
})

const deleteTourRoute = createRoute({
  method: 'delete',
  path: '/api/store/{storeId}/tours/{tourId}',
  request: { params: tourParams },
  responses: {
    204: { description: 'The tour guide is deleted with its stops. Only one that was never published can be', headers: requestIdHeader },
    ...problemResponses,
  },
})

// The Idempotency-Key middleware and the store guard sit before these (createApp), so the handlers read the
// verified store from `c.get('store')`, never from the path.
export function registerTourRoutes(app: OpenAPIHono<AppEnv>, useCases: TourUseCases): void {
  app.openapi(createTourRoute, async (c) => {
    const result = await useCases.createTour(c.get('actor'), c.get('store').storeId, tourChanges(c.req.valid('json')), c.get('requestId'))
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(tourView(result.value), 201, etag(result.value))
  })

  app.openapi(saveTourRoute, async (c) => {
    const ifMatch = readIfMatch(c)
    if (!ifMatch.ok)
      return ifMatch.response
    const result = await useCases.saveTour(c.get('actor'), c.get('store').storeId, c.req.valid('param').tourId, ifMatch.version, tourChanges(c.req.valid('json')), c.get('requestId'))
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(tourView(result.value), 200, etag(result.value))
  })

  app.openapi(publishTourRoute, async (c) => {
    const ifMatch = readIfMatch(c)
    if (!ifMatch.ok)
      return ifMatch.response
    const result = await useCases.publishTour(c.get('actor'), c.get('store').storeId, c.req.valid('param').tourId, ifMatch.version, c.get('requestId'))
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(tourView(result.value), 200, etag(result.value))
  })

  app.openapi(unpublishTourRoute, async (c) => {
    const ifMatch = readIfMatch(c)
    if (!ifMatch.ok)
      return ifMatch.response
    const result = await useCases.unpublishTour(c.get('actor'), c.get('store').storeId, c.req.valid('param').tourId, ifMatch.version, c.get('requestId'))
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(tourView(result.value), 200, etag(result.value))
  })

  app.openapi(deleteTourRoute, async (c) => {
    const result = await useCases.deleteTour(c.get('actor'), c.get('store').storeId, c.req.valid('param').tourId, c.get('requestId'))
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.body(null, 204)
  })
}
