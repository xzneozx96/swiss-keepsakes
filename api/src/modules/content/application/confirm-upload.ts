import type { Actor } from '@sk/domain/identity'
import type { AuditLog, Clock, JobQueue, MediaRecord, MediaRepository, ObjectStorage, UnitOfWork } from '../ports.ts'
import type { Result } from './failure.ts'
import { createHash } from 'node:crypto'
import { confirmedKey, MEDIA_RULES, originalKey, parseUploadKey, sniffContentType } from '@sk/domain/content'
import { ObjectTooLargeError } from '../ports.ts'
import { mayManageContent, staffActor } from './access.ts'
import { fail, ok } from './failure.ts'
import { mediaQueues } from './media-queues.ts'

export interface ConfirmUploadDeps<T> {
  uow: UnitOfWork<T>
  media: MediaRepository<T>
  storage: ObjectStorage
  jobs: JobQueue<T>
  audit: AuditLog<T>
  clock: Clock
  newId: () => string
}

// Turns the raw upload a browser PUT into a media row. The key the client sends is untrusted: it must be a raw
// upload key of this store, else nothing is read. The stored bytes are checked again (size from the head, then the
// magic bytes against the type the PUT declared), so a file that lies is refused and its raw upload deleted.
// Storage work happens before the transaction and none inside it. The verified bytes are copied to the confirmed
// source key and the raw upload is deleted, which also makes a second confirm of the same key upload-missing. If
// the transaction fails, row and job vanish together; the confirmed source stays and the abandoned-source sweep
// removes it.
export function makeConfirmUpload<T>({ uow, media, storage, jobs, audit, clock, newId }: ConfirmUploadDeps<T>) {
  const refuse = async (key: string, reason: 'type-not-allowed' | 'too-large' | 'empty' | 'content-mismatch') => {
    await storage.delete('uploads', key)
    return fail({ reason })
  }
  return async (actor: Actor, storeId: string, input: { uploadKey: string }, requestId: string | null): Promise<Result<MediaRecord>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    const key = input.uploadKey
    const parsed = parseUploadKey(key)
    if (!parsed || parsed.storeId !== storeId)
      return fail({ reason: 'upload-missing' })
    const head = await storage.head('uploads', key)
    if (!head)
      return fail({ reason: 'upload-missing' })
    if (head.size === 0)
      return refuse(key, 'empty')
    const declared = head.contentType !== undefined && Object.hasOwn(MEDIA_RULES.types, head.contentType) ? MEDIA_RULES.types[head.contentType] : undefined
    if (!declared)
      return refuse(key, 'type-not-allowed')
    if (head.size > declared.maxBytes)
      return refuse(key, 'too-large')
    // The cap goes to the storage too, so an object that grew since the head is never read whole.
    let bytes: Uint8Array | undefined
    try {
      bytes = await storage.get('uploads', key, declared.maxBytes)
    }
    catch (error) {
      if (error instanceof ObjectTooLargeError)
        return refuse(key, 'too-large')
      throw error
    }
    if (!bytes)
      return fail({ reason: 'upload-missing' })
    if (bytes.byteLength === 0)
      return refuse(key, 'empty')
    const sniffed = sniffContentType(bytes)
    if (sniffed === undefined || sniffed !== head.contentType)
      return refuse(key, 'content-mismatch')
    if (bytes.byteLength > declared.maxBytes)
      return refuse(key, 'too-large')

    const id = newId()
    const sha256 = createHash('sha256').update(bytes).digest('hex')
    await storage.put('uploads', confirmedKey(storeId, id, declared.ext), bytes, { contentType: sniffed })
    await storage.delete('uploads', key)

    return uow.run(async (tx) => {
      const row = await media.insert(tx, {
        id,
        storeId,
        kind: declared.kind,
        storageKey: originalKey(storeId, id, declared.ext),
        contentType: sniffed,
        byteSize: bytes.byteLength,
        sha256,
      }, clock.now())
      await audit.record(tx, {
        storeId,
        actor: staffActor(actor),
        entity: 'media',
        entityId: id,
        action: 'confirmed',
        after: { kind: row.kind, contentType: row.contentType, byteSize: row.byteSize },
        requestId,
      })
      await jobs.send(tx, mediaQueues.process, { storeId, mediaId: id })
      return ok(row)
    })
  }
}
