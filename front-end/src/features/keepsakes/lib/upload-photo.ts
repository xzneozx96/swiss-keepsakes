import type { Media } from '@sk/api-contract'

import { checkUploadRequest } from '@sk/domain/content'
import { answer, FILE_CALL_TIMEOUT_MS, keyed, loadClient, problemOf, timeout, uploadTimeoutMs } from '@/features/data-client/api-transport'

/** Waits for the worker, which resizes the photo: a few seconds, so ten at most. */
const POLL_MS = 800
const POLL_ATTEMPTS = 12

export type UploadRefusal = 'type' | 'size' | 'processing' | 'failed'

export class PhotoUploadError extends Error {
  readonly refusal: UploadRefusal

  constructor(refusal: UploadRefusal) {
    super(`photo upload: ${refusal}`)
    this.name = 'PhotoUploadError'
    this.refusal = refusal
  }
}

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

/**
 * The media library N18 is not built yet (E4.11), so a keepsake photo goes straight through the media routes: ask for
 * a grant, PUT the file to storage, confirm it, then read it until the worker has made it ready. The file must be a
 * JPEG, PNG or WebP photo within the size rule that the API checks again. Each step is its
 * own request with its own Idempotency-Key, because the steps are not one intent the API can replay.
 */
export async function uploadPhoto(storeId: string, file: File): Promise<Media> {
  const check = checkUploadRequest({ contentType: file.type, byteSize: file.size })

  if (!check.ok || check.kind !== 'image')
    throw new PhotoUploadError(check.ok || check.reason === 'type-not-allowed' ? 'type' : 'size')
  const client = await loadClient()
  const grant = await answer(client.POST('/api/store/{storeId}/media/uploads', {
    ...keyed(crypto.randomUUID()),
    params: { path: { storeId } },
    body: { contentType: file.type, byteSize: file.size },
  }))
  const put = await fetch(grant.url, { method: grant.method, headers: grant.headers, body: file, signal: timeout(uploadTimeoutMs(file.size)).signal })

  if (!put.ok)
    throw new PhotoUploadError('failed')
  let media = await answer(client.POST('/api/store/{storeId}/media/confirm', {
    ...keyed(crypto.randomUUID(), FILE_CALL_TIMEOUT_MS),
    params: { path: { storeId } },
    body: { uploadKey: grant.uploadKey },
  }))

  for (let attempt = 0; media.status === 'processing' && attempt < POLL_ATTEMPTS; attempt++) {
    await sleep(POLL_MS)
    const read = await client.GET('/api/store/{storeId}/media/{mediaId}', { ...timeout(), params: { path: { storeId, mediaId: media.id } } })

    if (read.data === undefined)
      throw problemOf(read.response, read.error)
    media = read.data
  }
  if (media.status !== 'ready')
    throw new PhotoUploadError(media.status === 'processing' ? 'processing' : 'failed')

  return media
}
