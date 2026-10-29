import type { CategoriesClient } from './client'

import { answer, keyed, loadClient, problemOf, timeout } from '@/features/data-client/api-transport'

export function createCategoriesClient(): CategoriesClient {
  return {
    list: async ({ storeId, kind }) =>
      answer((await loadClient()).GET('/api/store/{storeId}/categories/{kind}', { ...timeout(), params: { path: { storeId, kind } } })),
    create: async ({ storeId, kind, idempotencyKey, ...body }) =>
      answer((await loadClient()).POST('/api/store/{storeId}/categories/{kind}', { ...keyed(idempotencyKey), params: { path: { storeId, kind } }, body })),
    save: async ({ storeId, kind, id, idempotencyKey, ...body }) =>
      answer((await loadClient()).PATCH('/api/store/{storeId}/categories/{kind}/{categoryId}', { ...keyed(idempotencyKey), params: { path: { storeId, kind, categoryId: id } }, body })),
    reorder: async ({ storeId, kind, idempotencyKey, ...body }) =>
      answer((await loadClient()).PUT('/api/store/{storeId}/categories/{kind}/order', { ...keyed(idempotencyKey), params: { path: { storeId, kind } }, body })),
    remove: async ({ storeId, kind, id, idempotencyKey }) => {
      const { error, response } = await (await loadClient()).DELETE('/api/store/{storeId}/categories/{kind}/{categoryId}', { ...keyed(idempotencyKey), params: { path: { storeId, kind, categoryId: id } } })

      if (!response.ok)
        throw problemOf(response, error)
    },
  }
}
