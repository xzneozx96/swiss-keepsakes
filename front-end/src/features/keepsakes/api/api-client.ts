import type { KeepsakesClient } from './client'

import { answer, keyed, loadClient, timeout } from '@/features/data-client/api-transport'

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
  }
}
