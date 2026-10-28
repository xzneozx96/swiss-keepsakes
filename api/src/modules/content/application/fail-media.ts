import type { Clock, MediaAlert, MediaRepository, ObjectStorage, UnitOfWork } from '../ports.ts'
import type { MediaJob } from './process-media.ts'
import { mediaPrefix } from '@sk/domain/content'

export interface FailMediaDeps<T> {
  uow: UnitOfWork<T>
  media: MediaRepository<T>
  storage: ObjectStorage
  clock: Clock
  alert: MediaAlert
}

// Runs for a media job that pg-boss dead-lettered after its last attempt. A processing row is retired (a story or
// tour then refuses it as media-retired) and every object of the file is removed. A retired row is not updated
// again, but the purge still runs, so a retry after a failed delete finishes the job. A ready row is a file that
// was made and may be published: only its leftover source is removed, and it is neither retired nor purged nor
// alerted. The alert follows the deletes.
export function makeFailMedia<T>({ uow, media, storage, clock, alert }: FailMediaDeps<T>) {
  return async ({ storeId, mediaId }: MediaJob): Promise<void> => {
    const ready = await uow.run(async (tx) => {
      const row = await media.findById(tx, storeId, mediaId, { forUpdate: true })
      if (row?.status === 'ready')
        return true
      if (row && row.status !== 'retired')
        await media.retire(tx, row, clock.now())
      return false
    })
    for (const { key } of await storage.list('uploads', `confirmed/${storeId}/${mediaId}/`))
      await storage.delete('uploads', key)
    if (ready)
      return
    for (const { key } of await storage.list('media', mediaPrefix(storeId, mediaId)))
      await storage.delete('media', key)
    alert({ storeId, mediaId })
  }
}
