import type { MessageKey } from '@/i18n/en'

import { timeout, uploadTimeoutMs } from '@/features/data-client/api-transport'
import { ApiProblem } from '@/features/data-client/errors'
import { useCommand } from '@/features/data-client/use-command'

export type UploadResult = { id: string } | { message: MessageKey }

const failures: Record<string, MessageKey> = {
  'media-type-not-allowed': 'places.photo.badType',
  'media-content-mismatch': 'places.photo.badType',
  'media-too-large': 'places.photo.tooLarge',
}

/**
 * Uploads one photo through the media endpoints that exist (request a grant, PUT the bytes, confirm) and returns the
 * media id for the form, or why it failed. There is no media library yet (E4.11), so this selects nothing else. Each
 * attempt has its own `Idempotency-Key`. Several uploads can run at once; the caller keeps the state of each.
 */
export function usePhotoUpload(storeId: string) {
  // A failure is shown on the photo's own row, so the cache's error toast is off.
  const request = useCommand('places', 'requestUpload', { meta: { silent: true } })
  const confirm = useCommand('places', 'confirmUpload', { meta: { silent: true } })

  return async function upload(file: File): Promise<UploadResult> {
    try {
      const grant = await request.mutateAsync({ storeId, contentType: file.type, byteSize: file.size, idempotencyKey: crypto.randomUUID() })
      const put = await fetch(grant.url, { method: grant.method, headers: grant.headers, body: file, signal: timeout(uploadTimeoutMs(file.size)).signal })

      if (!put.ok)
        throw new Error('storage refused the file')
      const media = await confirm.mutateAsync({ storeId, uploadKey: grant.uploadKey, fileName: file.name, idempotencyKey: crypto.randomUUID() })

      return { id: media.id }
    }
    catch (error) {
      return { message: (error instanceof ApiProblem && failures[error.type]) || 'places.photo.failed' }
    }
  }
}
