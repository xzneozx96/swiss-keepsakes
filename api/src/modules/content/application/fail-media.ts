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

// Runs for a media job that pg-boss dead-lettered after its last attempt. The row is retired (a story or tour
// then refuses it as media-retired) and every object of the file is removed. A retired row is not updated again,
// but the deletes always run, so a retry after a failed delete finishes the job. The alert follows the deletes.
export function makeFailMedia<T>({ uow, media, storage, clock, alert }: FailMediaDeps<T>) {
  return async ({ storeId, mediaId }: MediaJob): Promise<void> => {
    await uow.run(async (tx) => {
      const row = await media.findById(tx, storeId, mediaId, { forUpdate: true })
      if (row && row.status !== 'retired')
        await media.retire(tx, row, clock.now())
    })
    const sources = await storage.list('uploads', `confirmed/${storeId}/${mediaId}/`)
    for (const { key } of sources)
      await storage.delete('uploads', key)
    for (const { key } of await storage.list('media', mediaPrefix(storeId, mediaId)))
      await storage.delete('media', key)
    alert({ storeId, mediaId })
  }
}
