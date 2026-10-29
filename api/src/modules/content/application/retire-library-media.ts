import type { Actor } from '@sk/domain/identity'
import type { AuditLog, Clock, JobQueue, MediaRecord, MediaRepository } from '../ports.ts'
import type { Result } from './failure.ts'
import type { MediaLibraryDeps } from './list-media.ts'
import { mayManageContent, staffActor } from './access.ts'
import { fail, ok } from './failure.ts'
import { mediaQueues } from './media-queues.ts'

export type RetireLibraryMediaDeps<T> = MediaLibraryDeps<T> & {
  media: MediaRepository<T>
  jobs: JobQueue<T>
  audit: AuditLog<T>
  clock: Clock
  graceHours: number
}

// The merchant's Retire. Refused, in this order, for a retired file, a processing file and a file any page uses: a
// story (published or draft), a pin, a tour or a keepsake photo. The keepsake read comes from the catalog module and is
// made inside the transaction that holds the row lock, so a keepsake cannot be saved with the file between the check
// and the update. The database trigger media_not_retired_while_used covers content's own tables as the last guard.
// The objects are deleted by the retire job after the grace period, which asks again before it deletes.
export function makeRetireLibraryMedia<T>({ uow, media, library, keepsakes, jobs, audit, clock, graceHours }: RetireLibraryMediaDeps<T>) {
  return async (actor: Actor, storeId: string, mediaId: string, requestId: string | null): Promise<Result<MediaRecord>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    return uow.run(async (tx) => {
      const row = await media.findById(tx, storeId, mediaId, { forUpdate: true })
      if (!row)
        return fail({ reason: 'not-found' })
      if (row.status === 'retired')
        return fail({ reason: 'media-already-retired' })
      if (row.status === 'processing')
        return fail({ reason: 'media-not-ready' })
      const uses = await library.usesOf(tx, storeId, mediaId, await keepsakes.list(tx, storeId))
      if (uses.length > 0)
        return fail({ reason: 'media-in-use', pages: uses.length })
      const now = clock.now()
      const retired = await media.retire(tx, row, now)
      if (!retired)
        return fail({ reason: 'not-found' })
      await audit.record(tx, {
        storeId,
        actor: staffActor(actor),
        entity: 'media',
        entityId: mediaId,
        action: 'retired',
        before: { status: row.status },
        after: { status: 'retired' },
        requestId,
      })
      await jobs.send(tx, mediaQueues.retire, { storeId, mediaId }, { startAfter: new Date(now.getTime() + graceHours * 3_600_000) })
      return ok(retired)
    })
  }
}
