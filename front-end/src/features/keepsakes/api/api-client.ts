import type { KeepsakesClient } from './client'

import { keyed, loadClient, problemOf, timeout } from '@/features/data-client/api-transport'
import { KeepsakeProblem } from '../lib/problems'

/** The data, or the API's problem with its `errors`, which carry the refusals of the options and variants rules. */
async function answer<T>(call: Promise<{ data?: T, error?: unknown, response: Response }>): Promise<T> {
  const { data, error, response } = await call

  if (data === undefined)
    throw new KeepsakeProblem(problemOf(response, error), error)

  return data
}

export function createKeepsakesClient(): KeepsakesClient {
  return {
    list: async storeId =>
      answer((await loadClient()).GET('/api/store/{storeId}/products', { ...timeout(), params: { path: { storeId } } })),
    get: async ({ storeId, id }) =>
      answer((await loadClient()).GET('/api/store/{storeId}/products/{productId}', { ...timeout(), params: { path: { storeId, productId: id } } })),
    create: async ({ storeId, idempotencyKey, ...body }) =>
      answer((await loadClient()).POST('/api/store/{storeId}/products', { ...keyed(idempotencyKey), params: { path: { storeId } }, body })),
    save: async ({ storeId, id, ifMatch, idempotencyKey, ...body }) =>
      answer((await loadClient()).PATCH('/api/store/{storeId}/products/{productId}', {
        ...keyed(idempotencyKey),
        params: { path: { storeId, productId: id }, header: { 'If-Match': String(ifMatch) } },
        body,
      })),
    publish: async ({ storeId, id, ifMatch, idempotencyKey }) =>
      answer((await loadClient()).POST('/api/store/{storeId}/products/{productId}/publish', {
        ...keyed(idempotencyKey),
        params: { path: { storeId, productId: id }, header: { 'If-Match': String(ifMatch) } },
      })),
    unpublish: async ({ storeId, id, ifMatch, idempotencyKey }) =>
      answer((await loadClient()).POST('/api/store/{storeId}/products/{productId}/unpublish', {
        ...keyed(idempotencyKey),
        params: { path: { storeId, productId: id }, header: { 'If-Match': String(ifMatch) } },
      })),
    saveVariant: async ({ storeId, id, variantId, idempotencyKey, ...body }) =>
      answer((await loadClient()).PATCH('/api/store/{storeId}/products/{productId}/variants/{skuId}', {
        ...keyed(idempotencyKey),
        params: { path: { storeId, productId: id, skuId: variantId } },
        body,
      })),
    saveOptions: async ({ storeId, id, ifMatch, idempotencyKey, ...body }) =>
      answer((await loadClient()).PUT('/api/store/{storeId}/products/{productId}/options', {
        ...keyed(idempotencyKey),
        params: { path: { storeId, productId: id }, header: { 'If-Match': String(ifMatch) } },
        body,
      })),
    createVariant: async ({ storeId, id, idempotencyKey, ...body }) =>
      answer((await loadClient()).POST('/api/store/{storeId}/products/{productId}/variants', {
        ...keyed(idempotencyKey),
        params: { path: { storeId, productId: id } },
        body,
      })),
  }
}
