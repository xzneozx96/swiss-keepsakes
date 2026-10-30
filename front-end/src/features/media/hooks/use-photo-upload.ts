import type { MessageKey } from '@/i18n/en'

import { checkUploadRequest } from '@sk/domain/content'
import { timeout, uploadTimeoutMs } from '@/features/data-client/api-transport'
import { ApiProblem } from '@/features/data-client/errors'
import { useCommand } from '@/features/data-client/use-command'

export type UploadResult = { id: string } | { message: MessageKey }

const failures: Record<string, MessageKey> = {
  'media-type-not-allowed': 'media.photo.badType',
  'media-content-mismatch': 'media.photo.badType',
  'media-too-large': 'media.photo.tooLarge',
}

/** Why a file cannot be a photo, from the rules the API checks again; undefined when it may go up. */
function refusalOf(file: File): MessageKey | undefined {
  const check = checkUploadRequest({ contentType: file.type, byteSize: file.size })

  if (check.ok)
    return check.kind === 'image' ? undefined : 'media.photo.badType'

  // An empty file is left to the API, which says so.
  return check.reason === 'empty' ? undefined : failures[check.reason === 'too-large' ? 'media-too-large' : 'media-type-not-allowed']
}

/**
 * Uploads one photo through the media endpoints (request a grant, PUT the bytes, confirm) and returns the media id
 * for the form, or why it failed. A file that is not a JPEG, PNG or WebP photo, or is too large, is refused here
 * without a request. Each attempt has its own `Idempotency-Key`. Several uploads can run at once; the caller keeps
 * the state of each. The id comes back as soon as the file is confirmed: the worker may still be making its copies.
 */
export function usePhotoUpload(storeId: string) {
  // A failure is shown on the photo's own row, so the cache's error toast is off.
  const request = useCommand('media', 'requestUpload', { meta: { silent: true } })
  const confirm = useCommand('media', 'confirmUpload', { meta: { silent: true } })

  return async function upload(file: File): Promise<UploadResult> {
    const refusal = refusalOf(file)

    if (refusal)
      return { message: refusal }
    try {
      const grant = await request.mutateAsync({ storeId, contentType: file.type, byteSize: file.size, idempotencyKey: crypto.randomUUID() })
      const put = await fetch(grant.url, { method: grant.method, headers: grant.headers, body: file, signal: timeout(uploadTimeoutMs(file.size)).signal })

      if (!put.ok)
        throw new Error('storage refused the file')
      const media = await confirm.mutateAsync({ storeId, uploadKey: grant.uploadKey, fileName: file.name, idempotencyKey: crypto.randomUUID() })

      return { id: media.id }
    }
    catch (error) {
      return { message: (error instanceof ApiProblem && failures[error.type]) || 'media.photo.failed' }
    }
  }
}
