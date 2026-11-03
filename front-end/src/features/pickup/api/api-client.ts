import type { PickupClient } from './client'

import { keyed, loadClient, problemOf, timeout } from '@/features/data-client/api-transport'
import { PickupProblem } from '../lib/problems'

/** The data, or the API's problem with its `errors`, which name the 100-point limit. */
async function answer<T>(call: Promise<{ data?: T, error?: unknown, response: Response }>): Promise<T> {
  const { data, error, response } = await call

  if (data === undefined)
    throw new PickupProblem(problemOf(response, error), error)

  return data
}

export function createPickupClient(): PickupClient {
  return {
    list: async ({ storeId, archived }) =>
      answer((await loadClient()).GET('/api/store/{storeId}/pickup-places', {
        ...timeout(),
        params: { path: { storeId }, query: archived ? { archived: 'true' } : {} },
      })),
    create: async ({ storeId, idempotencyKey, ...body }) =>
      answer((await loadClient()).POST('/api/store/{storeId}/pickup-places', { ...keyed(idempotencyKey), params: { path: { storeId } }, body })),
    save: async ({ storeId, id, ifMatch, idempotencyKey, ...body }) =>
      answer((await loadClient()).PATCH('/api/store/{storeId}/pickup-places/{placeId}', {
        ...keyed(idempotencyKey),
        params: { path: { storeId, placeId: id }, header: { 'If-Match': String(ifMatch) } },
        body,
      })),
    archive: async ({ storeId, id, ifMatch, idempotencyKey }) =>
      answer((await loadClient()).POST('/api/store/{storeId}/pickup-places/{placeId}/archive', {
        ...keyed(idempotencyKey),
        params: { path: { storeId, placeId: id }, header: { 'If-Match': String(ifMatch) } },
      })),
    restore: async ({ storeId, id, ifMatch, idempotencyKey }) =>
      answer((await loadClient()).POST('/api/store/{storeId}/pickup-places/{placeId}/restore', {
        ...keyed(idempotencyKey),
        params: { path: { storeId, placeId: id }, header: { 'If-Match': String(ifMatch) } },
      })),
  }
}
