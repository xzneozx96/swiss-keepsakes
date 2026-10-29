import type { MediaKind } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { Clock, ObjectStorage } from '../ports.ts'
import type { Result } from './failure.ts'
import { checkUploadRequest, MEDIA_RULES, uploadKey } from '@sk/domain/content'
import { mayManageContent } from './access.ts'
import { fail, ok } from './failure.ts'

export interface UploadGrant {
  uploadKey: string
  url: string
  method: 'PUT'
  headers: Record<string, string>
  expiresAt: string
  kind: MediaKind
}

// Checks the declared type and size, then signs a URL for one raw upload in the `uploads` bucket. Nothing is
// stored here: confirm re-checks the bytes that arrive.
export function makeRequestUpload({ storage, clock, newId }: { storage: ObjectStorage, clock: Clock, newId: () => string }) {
  return async (actor: Actor, storeId: string, input: { contentType: string, byteSize: number }): Promise<Result<UploadGrant>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    const checked = checkUploadRequest(input)
    if (!checked.ok)
      return fail({ reason: checked.reason })
    const key = uploadKey(storeId, newId(), checked.ext)
    const expiresAt = new Date(clock.now().getTime() + MEDIA_RULES.presignExpirySeconds * 1000)
    const { url, headers } = await storage.presignPut({ key, contentType: input.contentType, byteSize: input.byteSize, expiresInSeconds: MEDIA_RULES.presignExpirySeconds })
    return ok({ uploadKey: key, url, method: 'PUT', headers, expiresAt: expiresAt.toISOString(), kind: checked.kind })
  }
}
