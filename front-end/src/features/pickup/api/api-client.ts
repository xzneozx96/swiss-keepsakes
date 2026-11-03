import type { PickupClient } from './client'

import { answer, keyed, loadClient, timeout } from '@/features/data-client/api-transport'

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
