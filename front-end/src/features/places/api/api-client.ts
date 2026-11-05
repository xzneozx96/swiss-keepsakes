import type { PlacesClient } from './client'

import { answer, keyed, loadClient, problemOf, timeout } from '@/features/data-client/api-transport'
import { PinProblem } from '../lib/problems'

const withVersion = (idempotencyKey: string, ifMatch: number) => ({ ...keyed(idempotencyKey), params: { header: { 'If-Match': String(ifMatch) } } })

export function createPlacesClient(): PlacesClient {
  return {
    list: async ({ storeId, query }) =>
      answer((await loadClient()).GET('/api/store/{storeId}/pins', { ...timeout(), params: { path: { storeId }, query } })),
    get: async ({ storeId, id }) =>
      answer((await loadClient()).GET('/api/store/{storeId}/pins/{pinId}', { ...timeout(), params: { path: { storeId, pinId: id } } })),
    storyOptions: async ({ storeId, query }) =>
      answer((await loadClient()).GET('/api/store/{storeId}/pins/story-options', { ...timeout(), params: { path: { storeId }, query } })),
    storyVersion: async ({ storeId, groupId, language }) =>
      answer((await loadClient()).GET('/api/store/{storeId}/story-groups/{groupId}/versions/{language}', { ...timeout(), params: { path: { storeId, groupId, language } } })),
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
        throw new PinProblem(problemOf(response, error), error)
    },
    resolveMapsLink: async ({ storeId, url }) =>
      answer((await loadClient()).GET('/api/store/{storeId}/maps-link', { ...timeout(), params: { path: { storeId }, query: { url } } })),
    addressAt: async ({ storeId, latitude, longitude }) =>
      answer((await loadClient()).GET('/api/store/{storeId}/address-at', { ...timeout(), params: { path: { storeId }, query: { lat: latitude, lng: longitude } } })),
  }
}
