import type { Actor } from '@sk/domain/identity'
import type { AuditLog, Clock, JobQueue, MediaRecord, MediaRepository, ObjectStorage, UnitOfWork } from '../ports.ts'
import type { Result } from './failure.ts'
import { createHash } from 'node:crypto'
import { cleanFileName, isCurrentObject, MEDIA_RULES, mediaPrefix, versionedKey } from '@sk/domain/content'
import { mayManageContent, staffActor } from './access.ts'
import { buildMediaObjects } from './build-media-objects.ts'
import { fail, ok } from './failure.ts'
import { mediaQueues } from './media-queues.ts'
import { readUpload } from './read-upload.ts'

export interface ReplaceMediaDeps<T> {
  uow: UnitOfWork<T>
  media: MediaRepository<T>
  storage: ObjectStorage
  jobs: JobQueue<T>
  audit: AuditLog<T>
  clock: Clock
  graceHours: number
  maxInputPixels?: number
}

// AC51. A replacement keeps the row, so every page that holds the media id shows the new file. The new file is built
// under a new versioned key before the row moves (the row stays ready, on its old key, while the objects are made, so
// no live page loses its picture), then one update swaps the key under the row lock. The old objects stay for the
// grace period, because a browser or a CDN may still hold the old URL, and the purge job removes them. A key is never
// overwritten (ADR-004). The new key holds the hash of the file, so two replacements that race write different keys.
// A replacement that finds the row changed (retired, or replaced by someone else) writes nothing to the row and
// removes the objects it made.
export function makeReplaceMedia<T>({ uow, media, storage, jobs, audit, clock, graceHours, maxInputPixels = MEDIA_RULES.maxInputPixels }: ReplaceMediaDeps<T>) {
  return async (actor: Actor, storeId: string, mediaId: string, input: { uploadKey: string, fileName?: string }, requestId: string | null): Promise<Result<MediaRecord>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    const current = await uow.run(tx => media.findById(tx, storeId, mediaId))
    if (!current)
      return fail({ reason: 'not-found' })
    if (current.status === 'retired')
      return fail({ reason: 'media-already-retired' })
    if (current.status === 'processing')
      return fail({ reason: 'media-not-ready' })

    const upload = await readUpload(storage, storeId, input.uploadKey)
    if (!upload.ok)
      return fail({ reason: upload.reason })
    if (upload.kind !== current.kind) {
      await storage.delete('uploads', input.uploadKey)
      return fail({ reason: 'media-kind-mismatch' })
    }
    const sha256 = createHash('sha256').update(upload.bytes).digest('hex')
    const storageKey = versionedKey(storeId, mediaId, current.version + 1, sha256, upload.ext)
    const dims = await buildMediaObjects(storage, { kind: current.kind, contentType: upload.contentType, storageKey, source: upload.bytes }, maxInputPixels)
    const fileName = (input.fileName === undefined ? undefined : cleanFileName(input.fileName)) ?? current.fileName

    const removeNewObjects = async () => {
      for (const { key } of await storage.list('media', storageKey.slice(0, storageKey.lastIndexOf('/') + 1)))
        await storage.delete('media', key)
    }
    let outcome: Result<MediaRecord>
    try {
      outcome = await uow.run(async (tx) => {
        const row = await media.findById(tx, storeId, mediaId, { forUpdate: true })
        if (!row)
          return fail({ reason: 'not-found' })
        if (row.status !== 'ready')
          return fail({ reason: row.status === 'retired' ? 'media-already-retired' : 'media-not-ready' })
        if (row.version !== current.version)
          return fail({ reason: 'stale' })
        const now = clock.now()
        const replaced = await media.replace(tx, row, {
          storageKey,
          contentType: upload.contentType,
          byteSize: upload.bytes.byteLength,
          sha256,
          width: dims?.width ?? null,
          height: dims?.height ?? null,
          fileName,
        }, now)
        if (!replaced)
          return fail({ reason: 'not-found' })
        await audit.record(tx, {
          storeId,
          actor: staffActor(actor),
          entity: 'media',
          entityId: mediaId,
          action: 'replaced',
          before: { version: row.version, storageKey: row.storageKey, byteSize: row.byteSize },
          after: { version: replaced.version, storageKey: replaced.storageKey, byteSize: replaced.byteSize },
          requestId,
        })
        await jobs.send(tx, mediaQueues.purge, { storeId, mediaId }, { startAfter: new Date(now.getTime() + graceHours * 3_600_000) })
        return ok(replaced)
      })
    }
    catch (error) {
      await removeNewObjects().catch(() => undefined)
      throw error
    }
    if (!outcome.ok) {
      await removeNewObjects()
      return outcome
    }
    // The upload is spent. A failed delete leaves a raw object the abandoned-upload sweep removes.
    await storage.delete('uploads', input.uploadKey).catch(() => undefined)
    return outcome
  }
}

// The purge job: after the grace period of a replacement, removes every object of the file that is not beside its
// current key. A retired or missing row is left to the retire job, which removes the whole folder.
// A file written in the last ten minutes is left alone, because a replacement that is still being made has written it
// and has not moved the row yet.
const FRESH_MS = 10 * 60_000

export function makePurgeOldVersions<T>({ uow, media, storage, clock }: { uow: UnitOfWork<T>, media: Pick<MediaRepository<T>, 'findById'>, storage: ObjectStorage, clock: Clock }) {
  return async ({ storeId, mediaId }: { storeId: string, mediaId: string }): Promise<void> => {
    const row = await uow.run(tx => media.findById(tx, storeId, mediaId))
    if (!row || row.status === 'retired')
      return
    const now = clock.now().getTime()
    for (const { key, lastModified } of await storage.list('media', mediaPrefix(storeId, mediaId))) {
      const fresh = lastModified !== undefined && now - lastModified.getTime() < FRESH_MS
      if (!isCurrentObject(row.storageKey, key) && !fresh)
        await storage.delete('media', key)
    }
  }
}
