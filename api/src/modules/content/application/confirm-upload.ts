import type { Actor } from '@sk/domain/identity'
import type { AuditLog, Clock, JobQueue, MediaRecord, MediaRepository, ObjectStorage, UnitOfWork } from '../ports.ts'
import type { Result } from './failure.ts'
import { createHash } from 'node:crypto'
import { cleanFileName, confirmedKey, defaultMediaName, originalKey } from '@sk/domain/content'
import { mayManageContent, staffActor } from './access.ts'
import { fail, ok } from './failure.ts'
import { mediaQueues } from './media-queues.ts'
import { readUpload } from './read-upload.ts'

export interface ConfirmUploadDeps<T> {
  uow: UnitOfWork<T>
  media: MediaRepository<T>
  storage: ObjectStorage
  jobs: JobQueue<T>
  audit: AuditLog<T>
  clock: Clock
  newId: () => string
}

// Turns the raw upload a browser PUT into a media row (readUpload checks the key and the bytes).
// Storage work happens before the transaction and none inside it. The verified bytes are copied to the confirmed
// source key and the raw upload is deleted, which also makes a second confirm of the same key upload-missing. If
// the transaction fails, row and job vanish together; the confirmed source stays and the abandoned-source sweep
// removes it.
export function makeConfirmUpload<T>({ uow, media, storage, jobs, audit, clock, newId }: ConfirmUploadDeps<T>) {
  return async (actor: Actor, storeId: string, input: { uploadKey: string, fileName?: string }, requestId: string | null): Promise<Result<MediaRecord>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    const upload = await readUpload(storage, storeId, input.uploadKey)
    if (!upload.ok)
      return fail({ reason: upload.reason })
    const { bytes, contentType: sniffed } = upload
    const declared = { kind: upload.kind, ext: upload.ext }
    const key = input.uploadKey

    const id = newId()
    // The uploaded file name is the name until the merchant renames the file. A blank or missing one gets a default.
    const name = (input.fileName === undefined ? undefined : cleanFileName(input.fileName)) ?? defaultMediaName(declared.kind, id, declared.ext)
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
        name,
        fileName: name,
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
