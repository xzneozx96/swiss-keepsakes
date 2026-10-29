import type { MediaKind, SniffedContentType } from '@sk/domain/content'
import type { ObjectStorage } from '../ports.ts'
import { mediaRuleFor, parseUploadKey, sniffContentType } from '@sk/domain/content'
import { ObjectTooLargeError } from '../ports.ts'

export type UploadRefusal = 'upload-missing' | 'type-not-allowed' | 'too-large' | 'empty' | 'content-mismatch'

export type ReadUpload
  = | { ok: true, bytes: Uint8Array, contentType: SniffedContentType, kind: MediaKind, ext: string }
    | { ok: false, reason: UploadRefusal }

// Reads the raw upload a browser PUT and checks it again. The key the client sends is untrusted: it must be a raw
// upload key of this store, else nothing is read. The stored bytes are checked (size from the head, then the magic
// bytes against the type the PUT declared), so a file that lies is refused and its raw upload deleted. A missing
// upload is not deleted (there is nothing to delete). Used by confirm (a new file) and replace (a new version).
export async function readUpload(storage: ObjectStorage, storeId: string, key: string): Promise<ReadUpload> {
  const refuse = async (reason: Exclude<UploadRefusal, 'upload-missing'>): Promise<ReadUpload> => {
    await storage.delete('uploads', key)
    return { ok: false, reason }
  }
  const parsed = parseUploadKey(key)
  if (!parsed || parsed.storeId !== storeId)
    return { ok: false, reason: 'upload-missing' }
  const head = await storage.head('uploads', key)
  if (!head)
    return { ok: false, reason: 'upload-missing' }
  if (head.size === 0)
    return refuse('empty')
  // Parameters such as `; charset=binary` are not part of the type.
  const storedType = head.contentType?.split(';')[0]?.trim().toLowerCase()
  const declared = storedType === undefined ? undefined : mediaRuleFor(storedType)
  if (!declared)
    return refuse('type-not-allowed')
  if (head.size > declared.maxBytes)
    return refuse('too-large')
  // The cap goes to the storage too, so an object that grew since the head is never read whole.
  let bytes: Uint8Array | undefined
  try {
    bytes = await storage.get('uploads', key, declared.maxBytes)
  }
  catch (error) {
    if (error instanceof ObjectTooLargeError)
      return refuse('too-large')
    throw error
  }
  if (!bytes)
    return { ok: false, reason: 'upload-missing' }
  if (bytes.byteLength === 0)
    return refuse('empty')
  const sniffed = sniffContentType(bytes)
  if (sniffed === undefined || sniffed !== storedType)
    return refuse('content-mismatch')
  if (bytes.byteLength > declared.maxBytes)
    return refuse('too-large')
  return { ok: true, bytes, contentType: sniffed, kind: declared.kind, ext: declared.ext }
}
