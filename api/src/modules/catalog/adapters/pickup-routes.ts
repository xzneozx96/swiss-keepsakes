import type { OpenAPIHono } from '@hono/zod-openapi'
import type { PickupPlace as PickupPlaceView } from '@sk/api-contract'
import type { Actor } from '@sk/domain/identity'
import type { AppEnv } from '../../../platform/http/app.ts'
import type { Result } from '../application/failure.ts'
import type { PickupTextInput } from '../application/pickup-rules.ts'
import type { PickupPlace, PickupPlaceEdit, PickupSpan } from '../ports.ts'
import { createRoute, z } from '@hono/zod-openapi'
import { pickupPlaceListQuerySchema, pickupPlaceListSchema, pickupPlaceOrderBodySchema, pickupPlacePatchBodySchema, pickupPlaceRemovalSchema, pickupPlaceSchema, pickupPlaceWriteBodySchema } from '@sk/api-contract'
import { problem } from '../../../platform/http/problem.ts'
import { problemResponses, requestIdHeader } from '../../../platform/http/responses.ts'
import { limitWholeList } from '../../../platform/http/whole-list-limits.ts'
import { readIfMatch } from './if-match.ts'
import { failureProblem } from './problems.ts'
import { etag, etagHeaders, json, storeParams, withIfMatch } from './route-parts.ts'

// What the pickup routes call. main.ts builds each from the module's use cases, wrapped by guardUseCases.
export interface PickupUseCases {
  listPickupPlaces: (actor: Actor, storeId: string, archived: boolean) => Promise<Result<PickupPlace[]>>
  getPickupPlace: (actor: Actor, storeId: string, placeId: string) => Promise<Result<PickupPlace>>
  createPickupPlace: (actor: Actor, storeId: string, input: PickupTextInput & { mapsLink: string, hours: PickupSpan[] }, requestId: string | null) => Promise<Result<PickupPlace>>
  savePickupPlace: (actor: Actor, storeId: string, placeId: string, ifMatch: number, changes: PickupPlaceEdit, requestId: string | null) => Promise<Result<PickupPlace>>
  reorderPickupPlaces: (actor: Actor, storeId: string, ids: string[], requestId: string | null) => Promise<Result<PickupPlace[]>>
  archivePickupPlace: (actor: Actor, storeId: string, placeId: string, ifMatch: number, requestId: string | null) => Promise<Result<PickupPlace>>
  restorePickupPlace: (actor: Actor, storeId: string, placeId: string, ifMatch: number, requestId: string | null) => Promise<Result<PickupPlace>>
  deletePickupPlace: (actor: Actor, storeId: string, placeId: string, ifMatch: number, requestId: string | null) => Promise<Result<{ id: string }>>
}

const placeParams = z.object({ storeId: z.uuid(), placeId: z.uuid() })
const path = '/api/store/{storeId}/pickup-places'

const listRoute = createRoute({
  method: 'get',
  path,
  request: { params: storeParams, query: pickupPlaceListQuerySchema },
  responses: {
    200: { description: 'The active pickup points by position, or the archived ones with `archived=true`', headers: requestIdHeader, content: json(pickupPlaceListSchema) },
    ...problemResponses,
  },
})

const createPlaceRoute = createRoute({
  method: 'post',
  path,
  request: { params: storeParams, body: { required: true, content: json(pickupPlaceWriteBodySchema) } },
  responses: {
    201: { description: 'The new pickup point, last in the list. 422 `maps-link-unreadable` when the link holds no position', headers: etagHeaders, content: json(pickupPlaceSchema) },
    ...problemResponses,
  },
})

const orderRoute = createRoute({
  method: 'put',
  path: `${path}/order`,
  request: { params: storeParams, body: { required: true, content: json(pickupPlaceOrderBodySchema) } },
  responses: {
    200: { description: 'The active pickup points in the new order', headers: requestIdHeader, content: json(pickupPlaceListSchema) },
    ...problemResponses,
  },
})

const getRoute = createRoute({
  method: 'get',
  path: `${path}/{placeId}`,
  request: { params: placeParams },
  responses: {
    200: { description: 'The pickup point with its hours', headers: etagHeaders, content: json(pickupPlaceSchema) },
    ...problemResponses,
  },
})

const saveRoute = createRoute({
  method: 'patch',
  path: `${path}/{placeId}`,
  request: { params: placeParams, ...withIfMatch, body: { required: true, content: json(pickupPlacePatchBodySchema) } },
  responses: {
    200: { description: 'The pickup point with the change saved. A left-out field stays; a new Google Maps link moves the pin (422 `maps-link-unreadable` when the link holds no position); hours replace the whole set', headers: etagHeaders, content: json(pickupPlaceSchema) },
    ...problemResponses,
  },
})

const archiveRoute = createRoute({
  method: 'post',
  path: `${path}/{placeId}/archive`,
  request: { params: placeParams, ...withIfMatch },
  responses: {
    200: { description: 'The pickup point is archived and leaves the active list. An archived point is returned as it is. A point that an order or a handover names can only be archived', headers: etagHeaders, content: json(pickupPlaceSchema) },
    ...problemResponses,
  },
})

const restoreRoute = createRoute({
  method: 'post',
  path: `${path}/{placeId}/restore`,
  request: { params: placeParams, ...withIfMatch },
  responses: {
    200: { description: 'The pickup point is active again, with its hours and its place in the order. An active point is returned as it is', headers: etagHeaders, content: json(pickupPlaceSchema) },
    ...problemResponses,
  },
})

const deleteRoute = createRoute({
  method: 'delete',
  path: `${path}/{placeId}`,
  request: { params: placeParams, ...withIfMatch },
  responses: {
    200: { description: 'The pickup point, active or archived, is deleted with its hours. 409 `pickup-in-use` when an order or a handover names it: archive it instead', headers: requestIdHeader, content: json(pickupPlaceRemovalSchema) },
    ...problemResponses,
  },
})

const view = ({ id, storeId, name, address, mapsLink, latitude, longitude, instructions, position, archived, hours, rowVersion }: PickupPlace): PickupPlaceView => ({ id, storeId, name, address, mapsLink, latitude, longitude, instructions, position, archived, hours, rowVersion })

// The Idempotency-Key middleware and the store guard sit before these (createApp), so the handlers read the
// verified store from `c.get('store')`, never from the path.
export function registerPickupRoutes(app: OpenAPIHono<AppEnv>, useCases: PickupUseCases): void {
  app.openapi(listRoute, async (c) => {
    const result = await useCases.listPickupPlaces(c.get('actor'), c.get('store').storeId, c.req.valid('query').archived === 'true')
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(limitWholeList(c, 'GET /api/store/{storeId}/pickup-places', { items: result.value.map(view) }), 200)
  })

  app.openapi(createPlaceRoute, async (c) => {
    const { name, address, mapsLink, instructions, hours } = c.req.valid('json')
    const result = await useCases.createPickupPlace(c.get('actor'), c.get('store').storeId, { name, address, mapsLink, instructions, hours }, c.get('requestId'))
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(view(result.value), 201, etag(result.value))
  })

  app.openapi(orderRoute, async (c) => {
    const result = await useCases.reorderPickupPlaces(c.get('actor'), c.get('store').storeId, c.req.valid('json').ids, c.get('requestId'))
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json({ items: result.value.map(view) }, 200)
  })

  app.openapi(getRoute, async (c) => {
    const result = await useCases.getPickupPlace(c.get('actor'), c.get('store').storeId, c.req.valid('param').placeId)
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(view(result.value), 200, etag(result.value))
  })

  app.openapi(saveRoute, async (c) => {
    const ifMatch = readIfMatch(c)
    if (!ifMatch.ok)
      return ifMatch.response
    const { name, address, mapsLink, instructions, hours } = c.req.valid('json')
    const changes: PickupPlaceEdit = {
      ...(name !== undefined && { name }),
      ...(address !== undefined && { address }),
      ...(mapsLink !== undefined && { mapsLink }),
      ...(instructions !== undefined && { instructions }),
      ...(hours !== undefined && { hours }),
    }
    const result = await useCases.savePickupPlace(c.get('actor'), c.get('store').storeId, c.req.valid('param').placeId, ifMatch.version, changes, c.get('requestId'))
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(view(result.value), 200, etag(result.value))
  })

  app.openapi(archiveRoute, async (c) => {
    const ifMatch = readIfMatch(c)
    if (!ifMatch.ok)
      return ifMatch.response
    const result = await useCases.archivePickupPlace(c.get('actor'), c.get('store').storeId, c.req.valid('param').placeId, ifMatch.version, c.get('requestId'))
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(view(result.value), 200, etag(result.value))
  })

  app.openapi(restoreRoute, async (c) => {
    const ifMatch = readIfMatch(c)
    if (!ifMatch.ok)
      return ifMatch.response
    const result = await useCases.restorePickupPlace(c.get('actor'), c.get('store').storeId, c.req.valid('param').placeId, ifMatch.version, c.get('requestId'))
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(view(result.value), 200, etag(result.value))
  })

  app.openapi(deleteRoute, async (c) => {
    const ifMatch = readIfMatch(c)
    if (!ifMatch.ok)
      return ifMatch.response
    const result = await useCases.deletePickupPlace(c.get('actor'), c.get('store').storeId, c.req.valid('param').placeId, ifMatch.version, c.get('requestId'))
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(result.value, 200)
  })
}
