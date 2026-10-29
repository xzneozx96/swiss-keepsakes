import type { MessageKey } from '@/i18n/en'

import { useState } from 'react'

import { ApiProblem } from '@/features/data-client/errors'
import { useCommand } from '@/features/data-client/use-command'

export type UploadState = { status: 'idle' } | { status: 'uploading' } | { status: 'failed', message: MessageKey }

const failures: Record<string, MessageKey> = {
  'media-type-not-allowed': 'places.photo.badType',
  'media-content-mismatch': 'places.photo.badType',
  'media-too-large': 'places.photo.tooLarge',
}

/**
 * Uploads one photo through the media endpoints that exist (request a grant, PUT the bytes, confirm) and returns the
 * media id for the form. There is no media library yet (E4.11), so this selects nothing else. Each attempt has its
 * own `Idempotency-Key`, and a failed attempt says why in words.
 */
export function usePhotoUpload(storeId: string) {
  // Every failure becomes `state` next to the field, so the cache's error toast is off.
  const request = useCommand('places', 'requestUpload', { meta: { silent: true } })
  const confirm = useCommand('places', 'confirmUpload', { meta: { silent: true } })
  const [state, setState] = useState<UploadState>({ status: 'idle' })

  async function upload(file: File): Promise<string | undefined> {
    setState({ status: 'uploading' })
    try {
      const grant = await request.mutateAsync({ storeId, contentType: file.type, byteSize: file.size, idempotencyKey: crypto.randomUUID() })
      const put = await fetch(grant.url, { method: grant.method, headers: grant.headers, body: file })

      if (!put.ok)
        throw new Error('storage refused the file')
      const media = await confirm.mutateAsync({ storeId, uploadKey: grant.uploadKey, idempotencyKey: crypto.randomUUID() })

      setState({ status: 'idle' })

      return media.id
    }
    catch (error) {
      setState({ status: 'failed', message: (error instanceof ApiProblem && failures[error.type]) || 'places.photo.failed' })

      return undefined
    }
  }

  return { state, upload, reset: () => setState({ status: 'idle' }) }
}
