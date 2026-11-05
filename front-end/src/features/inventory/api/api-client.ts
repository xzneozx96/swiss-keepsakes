import type { InventoryClient } from './client'

import { keyed, loadClient, problemOf, timeout } from '@/features/data-client/api-transport'
import { InventoryProblem } from '../lib/problems'

/** The data, or the API's problem with its `reserved` figure. */
async function answer<T>(call: Promise<{ data?: T, error?: unknown, response: Response }>): Promise<T> {
  const { data, error, response } = await call

  if (data === undefined)
    throw new InventoryProblem(problemOf(response, error), error)

  return data
}

export function createInventoryClient(): InventoryClient {
  return {
    list: async ({ storeId, query }) =>
      answer((await loadClient()).GET('/api/store/{storeId}/inventory', { ...timeout(), params: { path: { storeId }, query } })),
    get: async ({ storeId, skuId }) =>
      answer((await loadClient()).GET('/api/store/{storeId}/inventory/{skuId}', { ...timeout(), params: { path: { storeId, skuId } } })),
    set: async ({ storeId, skuId, onHand, idempotencyKey }) =>
      answer((await loadClient()).PUT('/api/store/{storeId}/inventory/{skuId}', {
        ...keyed(idempotencyKey),
        params: { path: { storeId, skuId } },
        body: { onHand },
      })),
  }
}
