import type { MediaClient } from './client'

import { answer, FILE_CALL_TIMEOUT_MS, keyed, loadClient, timeout, uploadTimeoutMs } from '@/features/data-client/api-transport'
import { ApiProblem } from '@/features/data-client/errors'

/** A grant, the PUT of the file to storage, and the key to confirm or replace with. */
async function putToStorage(storeId: string, file: File, contentType: string) {
  const client = await loadClient()
  const grant = await answer(client.POST('/api/store/{storeId}/media/uploads', {
    ...keyed(crypto.randomUUID()),
    params: { path: { storeId } },
    body: { contentType, byteSize: file.size },
  }))
  const put = await fetch(grant.url, { method: grant.method, headers: grant.headers, body: file, signal: timeout(uploadTimeoutMs(file.size)).signal })

  if (!put.ok)
    throw new ApiProblem(503, 'storage-unavailable', 'The file could not be sent to storage')

  return { client, uploadKey: grant.uploadKey }
}

export function createMediaClient(): MediaClient {
  return {
    list: async ({ storeId, query }) =>
      answer((await loadClient()).GET('/api/store/{storeId}/media', {
        ...timeout(),
        params: {
          path: { storeId },
          query: {
            kind: query.kind,
            q: query.q || undefined,
            use: query.use || undefined,
            status: query.status || undefined,
            page: query.page,
            pageSize: query.pageSize,
          },
        },
      })),
    uses: async ({ storeId, id }) =>
      answer((await loadClient()).GET('/api/store/{storeId}/media/{mediaId}/uses', { ...timeout(), params: { path: { storeId, mediaId: id } } })),
    upload: async ({ storeId, file, contentType }) => {
      const { client, uploadKey } = await putToStorage(storeId, file, contentType)

      return answer(client.POST('/api/store/{storeId}/media/confirm', {
        ...keyed(crypto.randomUUID(), FILE_CALL_TIMEOUT_MS),
        params: { path: { storeId } },
        body: { uploadKey, fileName: file.name },
      }))
    },
    replace: async ({ storeId, id, file, contentType }) => {
      const { client, uploadKey } = await putToStorage(storeId, file, contentType)

      return answer(client.POST('/api/store/{storeId}/media/{mediaId}/replace', {
        ...keyed(crypto.randomUUID(), FILE_CALL_TIMEOUT_MS),
        params: { path: { storeId, mediaId: id } },
        body: { uploadKey, fileName: file.name },
      }))
    },
    describe: async ({ storeId, id, idempotencyKey, ...body }) =>
      answer((await loadClient()).PATCH('/api/store/{storeId}/media/{mediaId}', { ...keyed(idempotencyKey), params: { path: { storeId, mediaId: id } }, body })),
    retire: async ({ storeId, id, idempotencyKey }) =>
      answer((await loadClient()).POST('/api/store/{storeId}/media/{mediaId}/retire', { ...keyed(idempotencyKey), params: { path: { storeId, mediaId: id } } })),
  }
}
