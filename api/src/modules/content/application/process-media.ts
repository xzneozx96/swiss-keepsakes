import type { Clock, MediaRepository, MediaWarn, ObjectStorage, UnitOfWork } from '../ports.ts'
import { confirmedKey, MEDIA_RULES, mediaPrefix } from '@sk/domain/content'
import { buildMediaObjects, MEDIA_CACHE_CONTROL } from './build-media-objects.ts'

export interface MediaJob {
  storeId: string
  mediaId: string
}

export interface ProcessMediaDeps<T> {
  uow: UnitOfWork<T>
  media: MediaRepository<T>
  storage: ObjectStorage
  clock: Clock
  // Told when the source delete after markReady fails. The abandoned-source sweep removes what is left.
  warn?: MediaWarn
  // Tests lower it to avoid building a huge image.
  maxInputPixels?: number
}

export { MEDIA_CACHE_CONTROL }

// One attempt of the media job. It reads the confirmed source, writes the public files, then marks the row ready
// under its lock and deletes the source. Any failure throws, so pg-boss retries; the dead-letter handler
// (makeFailMedia) retires the row after the last attempt. Every step is repeatable: the puts overwrite the same
// keys, and a row that is ready or retired ends the job (a ready row still has its source deleted, which finishes
// a run whose delete failed). Images are re-encoded after rotate() with no metadata (sharp drops it by default),
// so a public file never carries GPS. Variants are WebP, cut from the oriented image, never enlarged.
export function makeProcessMedia<T>({ uow, media, storage, clock, warn, maxInputPixels = MEDIA_RULES.maxInputPixels }: ProcessMediaDeps<T>) {
  return async ({ storeId, mediaId }: MediaJob): Promise<void> => {
    // A source that stays after the row is ready is harmless, so a failed delete must not fail the job (the retries
    // would end in fail-media). The sweep removes it after orphanedSourceHours.
    const dropSource = async (key: string) => {
      try {
        await storage.delete('uploads', key)
      }
      catch (error) {
        warn?.({ event: 'media.source-delete-failed', storeId, mediaId, error: error instanceof Error ? error.name : 'unknown' })
      }
    }
    const row = await uow.run(tx => media.findById(tx, storeId, mediaId))
    if (!row || row.status === 'retired')
      return
    const ext = row.storageKey.slice(row.storageKey.lastIndexOf('.') + 1)
    const sourceKey = confirmedKey(storeId, mediaId, ext)
    if (row.status === 'ready') {
      await dropSource(sourceKey)
      return
    }
    // The confirmed source is the verified upload, so it is never larger than the row's byte size.
    const source = await storage.get('uploads', sourceKey, row.byteSize)
    if (!source)
      throw new Error('The confirmed source is missing')
    const dims = await buildMediaObjects(storage, { kind: row.kind, contentType: row.contentType, storageKey: row.storageKey, source }, maxInputPixels)

    const outcome = await uow.run(async (tx) => {
      const locked = await media.findById(tx, storeId, mediaId, { forUpdate: true })
      if (locked?.status !== 'processing')
        return locked?.status ?? 'gone'
      await media.markReady(tx, locked, dims, clock.now())
      return 'marked'
    })
    if (outcome === 'ready') {
      // An overlapping run made it ready, and it may be published: its files stay.
      await dropSource(sourceKey)
      return
    }
    if (outcome !== 'marked') {
      // Retired or gone while the files were being made: nothing may stay public.
      for (const { key } of await storage.list('media', mediaPrefix(storeId, mediaId)))
        await storage.delete('media', key)
      return
    }
    await dropSource(sourceKey)
  }
}
