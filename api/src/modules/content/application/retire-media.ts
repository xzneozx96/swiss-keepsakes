import type { Clock, MediaRepository, ObjectStorage, UnitOfWork } from '../ports.ts'
import type { MediaJob } from './process-media.ts'
import { mediaPrefix } from '@sk/domain/content'

export interface RetireMediaDeps<T> {
  uow: UnitOfWork<T>
  media: MediaRepository<T>
  storage: ObjectStorage
  clock: Clock
}

// Runs once the grace period of a replaced file has passed. A missing row, or a file a tour or story references
// again meanwhile, is left alone. Otherwise the row is retired under its lock and, after the commit, every object
// of the file is deleted. A retired, unreferenced row is not updated again but the deletes still run, so a retry
// after a failed delete finishes the job.
export function makeRetireMedia<T>({ uow, media, storage, clock }: RetireMediaDeps<T>) {
  return async ({ storeId, mediaId }: MediaJob): Promise<void> => {
    const retiring = await uow.run(async (tx) => {
      const row = await media.findById(tx, storeId, mediaId, { forUpdate: true })
      if (!row || await media.isReferenced(tx, storeId, mediaId))
        return false
      if (row.status !== 'retired')
        await media.retire(tx, row, clock.now())
      return true
    })
    if (!retiring)
      return
    for (const { key } of await storage.list('media', mediaPrefix(storeId, mediaId)))
      await storage.delete('media', key)
  }
}
