import type { Clock, MediaRepository, ObjectStorage, UnitOfWork } from '../ports.ts'
import { confirmedKey, variantKey, variantWidthsFor } from '@sk/domain/content'
import sharp from 'sharp'

export interface MediaJob {
  storeId: string
  mediaId: string
}

export interface ProcessMediaDeps<T> {
  uow: UnitOfWork<T>
  media: MediaRepository<T>
  storage: ObjectStorage
  clock: Clock
}

export const MEDIA_CACHE_CONTROL = 'public, max-age=31536000, immutable'

const formats = { 'image/jpeg': 'jpeg', 'image/png': 'png', 'image/webp': 'webp' } as const

// One attempt of the media job. It reads the confirmed source, writes the public files, then marks the row ready
// under its lock and deletes the source. Any failure throws, so pg-boss retries; the dead-letter handler
// (makeFailMedia) retires the row after the last attempt. Every step is repeatable: the puts overwrite the same
// keys, and a row that is ready or retired ends the job (a ready row still has its source deleted, which finishes
// a run whose delete failed). Images are re-encoded after rotate() with no metadata (sharp drops it by default),
// so a public file never carries GPS. Variants are WebP, cut from the oriented image, never enlarged.
export function makeProcessMedia<T>({ uow, media, storage, clock }: ProcessMediaDeps<T>) {
  return async ({ storeId, mediaId }: MediaJob): Promise<void> => {
    const row = await uow.run(tx => media.findById(tx, storeId, mediaId))
    if (!row || row.status === 'retired')
      return
    const ext = row.storageKey.slice(row.storageKey.lastIndexOf('.') + 1)
    const sourceKey = confirmedKey(storeId, mediaId, ext)
    if (row.status === 'ready') {
      await storage.delete('uploads', sourceKey)
      return
    }
    const source = await storage.get('uploads', sourceKey)
    if (!source)
      throw new Error('The confirmed source is missing')
    const headers = { cacheControl: MEDIA_CACHE_CONTROL, ...(row.kind === 'pdf' && { contentDisposition: 'inline' }) }

    let dims: { width: number, height: number } | undefined
    if (row.kind === 'image') {
      const format = formats[row.contentType as keyof typeof formats]
      const { data, info } = await sharp(source).rotate().toFormat(format).toBuffer({ resolveWithObject: true })
      dims = { width: info.width, height: info.height }
      await storage.put('media', row.storageKey, data, { contentType: row.contentType, ...headers })
      for (const width of variantWidthsFor(info.width)) {
        const variant = await sharp(data).resize({ width, withoutEnlargement: true }).webp().toBuffer()
        await storage.put('media', variantKey(row.storageKey, width), variant, { contentType: 'image/webp', ...headers })
      }
    }
    else {
      await storage.put('media', row.storageKey, source, { contentType: row.contentType, ...headers })
    }

    await uow.run(async (tx) => {
      const locked = await media.findById(tx, storeId, mediaId, { forUpdate: true })
      if (locked?.status === 'processing')
        await media.markReady(tx, locked, dims, clock.now())
    })
    await storage.delete('uploads', sourceKey)
  }
}
