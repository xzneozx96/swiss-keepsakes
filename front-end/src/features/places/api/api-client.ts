import type { PlacesClient } from './client'

import { answer, keyed, loadClient, problemOf, timeout } from '@/features/data-client/api-transport'

const withVersion = (idempotencyKey: string, ifMatch: number) => ({ ...keyed(idempotencyKey), params: { header: { 'If-Match': String(ifMatch) } } })

export function createPlacesClient(): PlacesClient {
  return {
    list: async ({ storeId }) =>
      answer((await loadClient()).GET('/api/store/{storeId}/pins', { ...timeout(), params: { path: { storeId } } })),
    get: async ({ storeId, id }) =>
      answer((await loadClient()).GET('/api/store/{storeId}/pins/{pinId}', { ...timeout(), params: { path: { storeId, pinId: id } } })),
    storyOptions: async ({ storeId }) =>
      answer((await loadClient()).GET('/api/store/{storeId}/pins/story-options', { ...timeout(), params: { path: { storeId } } })),
    media: async ({ storeId, id }) =>
      answer((await loadClient()).GET('/api/store/{storeId}/media/{mediaId}', { ...timeout(), params: { path: { storeId, mediaId: id } } })),
    create: async ({ storeId, idempotencyKey, ...body }) =>
      answer((await loadClient()).POST('/api/store/{storeId}/pins', { ...keyed(idempotencyKey), params: { path: { storeId } }, body })),
    save: async ({ storeId, id, ifMatch, idempotencyKey, ...body }) => {
      const { params } = withVersion(idempotencyKey, ifMatch)

      return answer((await loadClient()).PATCH('/api/store/{storeId}/pins/{pinId}', { ...keyed(idempotencyKey), params: { ...params, path: { storeId, pinId: id } }, body }))
    },
    publish: async ({ storeId, id, ifMatch, idempotencyKey, ...body }) => {
      const { params } = withVersion(idempotencyKey, ifMatch)

      return answer((await loadClient()).POST('/api/store/{storeId}/pins/{pinId}/publish', { ...keyed(idempotencyKey), params: { ...params, path: { storeId, pinId: id } }, body }))
    },
    hide: async ({ storeId, id, ifMatch, idempotencyKey }) => {
      const { params } = withVersion(idempotencyKey, ifMatch)

      return answer((await loadClient()).POST('/api/store/{storeId}/pins/{pinId}/hide', { ...keyed(idempotencyKey), params: { ...params, path: { storeId, pinId: id } } }))
    },
    remove: async ({ storeId, id, ifMatch, idempotencyKey }) => {
      const { params } = withVersion(idempotencyKey, ifMatch)
      const { error, response } = await (await loadClient()).DELETE('/api/store/{storeId}/pins/{pinId}', { ...keyed(idempotencyKey), params: { ...params, path: { storeId, pinId: id } } })

      if (!response.ok)
        throw problemOf(response, error)
    },
    requestUpload: async ({ storeId, idempotencyKey, ...body }) =>
      answer((await loadClient()).POST('/api/store/{storeId}/media/uploads', { ...keyed(idempotencyKey), params: { path: { storeId } }, body })),
    confirmUpload: async ({ storeId, idempotencyKey, ...body }) =>
      answer((await loadClient()).POST('/api/store/{storeId}/media/confirm', { ...keyed(idempotencyKey), params: { path: { storeId } }, body })),
  }
}
