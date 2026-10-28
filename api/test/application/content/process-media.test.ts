import type { MediaRecord } from '../../../src/modules/content/ports.ts'
import { confirmedKey, originalKey, variantKey } from '@sk/domain/content'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { checkMedia } from '../../../src/modules/content/application/check-media.ts'
import { makeFailMedia } from '../../../src/modules/content/application/fail-media.ts'
import { makeProcessMedia, MEDIA_CACHE_CONTROL } from '../../../src/modules/content/application/process-media.ts'
import { createFakeMedia } from '../../support/fake-media.ts'
import { createFakeStorage } from '../../support/fake-storage.ts'
import { jpegWithGps, pngImage, undecodableJpeg } from '../../support/images.ts'
import { createManualClock } from '../../support/manual-clock.ts'

const store = '0190f0c2-0000-7000-8000-00000000000a'
const mediaId = '0190f0c2-0000-7000-8000-0000000000f1'
const tx = null

const kinds = {
  jpg: { kind: 'image', contentType: 'image/jpeg' },
  png: { kind: 'image', contentType: 'image/png' },
  pdf: { kind: 'pdf', contentType: 'application/pdf' },
  mp3: { kind: 'audio', contentType: 'audio/mpeg' },
} as const

async function setup(ext: keyof typeof kinds, bytes: Uint8Array | undefined) {
  const clock = createManualClock(new Date('2026-10-28T10:00:00Z'))
  const storage = createFakeStorage(clock)
  const row: MediaRecord = { id: mediaId, storeId: store, ...kinds[ext], storageKey: originalKey(store, mediaId, ext), byteSize: bytes?.byteLength ?? 1, sha256: 'a'.repeat(64), width: null, height: null, status: 'processing' }
  const media = createFakeMedia([row])
  if (bytes)
    storage.seed('uploads', confirmedKey(store, mediaId, ext), bytes, { contentType: row.contentType })
  const uow = { run: <R>(work: (t: null) => Promise<R>) => work(tx) }
  const alerts: object[] = []
  return {
    storage,
    media,
    row,
    alerts,
    processMedia: makeProcessMedia({ uow, media, storage, clock }),
    failMedia: makeFailMedia({ uow, media, storage, clock, alert: failure => alerts.push(failure) }),
    stored: (key: string) => storage.objects('media').get(key),
    keys: () => [...storage.objects('media').keys()].sort(),
    source: () => storage.objects('uploads').has(confirmedKey(store, mediaId, ext)),
  }
}

describe('[E2.7] process-media on images', () => {
  it('[E2.7] makes the original and a WebP variant per width, strips GPS, marks the row ready with the dimensions', async () => {
    const input = await jpegWithGps(3000, 2000)
    expect((await sharp(input).metadata()).exif).toBeDefined()
    const t = await setup('jpg', input)

    await t.processMedia({ storeId: store, mediaId })

    expect(t.media.rows.get(mediaId)).toMatchObject({ status: 'ready', width: 3000, height: 2000 })
    const key = originalKey(store, mediaId, 'jpg')
    expect(t.keys()).toEqual([key, ...[1280, 1920, 320, 640].map(w => variantKey(key, w))].sort())
    for (const [k, object] of t.storage.objects('media')) {
      const meta = await sharp(object.body).metadata()
      expect(meta.exif, k).toBeUndefined()
      expect(object.cacheControl).toBe(MEDIA_CACHE_CONTROL)
      expect(object.contentType).toBe(k === key ? 'image/jpeg' : 'image/webp')
      expect(meta.format).toBe(k === key ? 'jpeg' : 'webp')
    }
    expect((await sharp(t.stored(variantKey(key, 640))!.body).metadata()).width).toBe(640)
    expect(MEDIA_CACHE_CONTROL).toBe('public, max-age=31536000, immutable')
    expect(t.source()).toBe(false)
  })

  it('[E2.7] a 500 px wide image gets the 320 variant only, plus the original', async () => {
    const t = await setup('png', await pngImage(500, 300))

    await t.processMedia({ storeId: store, mediaId })

    const key = originalKey(store, mediaId, 'png')
    expect(t.keys()).toEqual([key, variantKey(key, 320)].sort())
    expect(t.stored(key)?.contentType).toBe('image/png')
  })

  it('[E2.7] a 200 px wide image gets one variant at its own width, never enlarged', async () => {
    const t = await setup('png', await pngImage(200, 100))

    await t.processMedia({ storeId: store, mediaId })

    const key = originalKey(store, mediaId, 'png')
    expect((await sharp(t.stored(variantKey(key, 200))!.body).metadata()).width).toBe(200)
  })

  it('[E2.7] an image rotated by EXIF is stored upright with the oriented dimensions', async () => {
    const input = await jpegWithGps(800, 400, 6)
    expect((await sharp(input).metadata()).orientation).toBe(6)
    const t = await setup('jpg', input)

    await t.processMedia({ storeId: store, mediaId })

    expect(t.media.rows.get(mediaId)).toMatchObject({ width: 400, height: 800 })
    const stored = await sharp(t.stored(originalKey(store, mediaId, 'jpg'))!.body).metadata()
    expect([stored.width, stored.height, stored.orientation]).toEqual([400, 800, undefined])
  })

  it('[E2.7] running the job twice changes nothing, also after the source is gone', async () => {
    const t = await setup('jpg', await jpegWithGps(800, 600))
    await t.processMedia({ storeId: store, mediaId })
    const before = structuredClone(Array.from(t.storage.objects('media'), ([k, o]) => [k, o.body.byteLength]))
    const row = t.media.rows.get(mediaId)

    await t.processMedia({ storeId: store, mediaId })

    expect(Array.from(t.storage.objects('media'), ([k, o]) => [k, o.body.byteLength])).toEqual(before)
    expect(t.media.rows.get(mediaId)).toEqual(row)
  })

  it('[E2.7] a retired row is left alone', async () => {
    const t = await setup('jpg', await jpegWithGps(800, 600))
    t.media.rows.set(mediaId, { ...t.row, status: 'retired' })

    await t.processMedia({ storeId: store, mediaId })

    expect(t.keys()).toEqual([])
    expect(t.media.rows.get(mediaId)?.status).toBe('retired')
  })

  it('[E2.7] garbage bytes with a JPEG header make the handler throw and leave the row processing', async () => {
    const t = await setup('jpg', undecodableJpeg)

    await expect(t.processMedia({ storeId: store, mediaId })).rejects.toThrow()

    expect(t.media.rows.get(mediaId)?.status).toBe('processing')
    expect(t.keys()).toEqual([])
  })

  it('[E2.7] a processing row whose source is missing throws, so pg-boss retries', async () => {
    const t = await setup('jpg', undefined)

    await expect(t.processMedia({ storeId: store, mediaId })).rejects.toThrow()
  })
})

describe('[E2.7] process-media on PDF and audio', () => {
  it('[E2.7] a PDF is stored unchanged with inline disposition and no dimensions', async () => {
    const pdf = new TextEncoder().encode('%PDF-1.4\n1 0 obj\n')
    const t = await setup('pdf', pdf)

    await t.processMedia({ storeId: store, mediaId })

    const object = t.stored(originalKey(store, mediaId, 'pdf'))
    expect(object).toMatchObject({ body: pdf, contentType: 'application/pdf', cacheControl: MEDIA_CACHE_CONTROL, contentDisposition: 'inline' })
    expect(t.media.rows.get(mediaId)).toMatchObject({ status: 'ready', width: null, height: null })
    expect(t.keys()).toHaveLength(1)
    expect(t.source()).toBe(false)
  })

  it('[E2.7] an MP3 is stored unchanged without a disposition', async () => {
    const mp3 = new Uint8Array([0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, 0])
    const t = await setup('mp3', mp3)

    await t.processMedia({ storeId: store, mediaId })

    const object = t.stored(originalKey(store, mediaId, 'mp3'))
    expect(object).toMatchObject({ body: mp3, contentType: 'audio/mpeg', cacheControl: MEDIA_CACHE_CONTROL })
    expect(object?.contentDisposition).toBeUndefined()
    expect(t.media.rows.get(mediaId)).toMatchObject({ status: 'ready', width: null, height: null })
  })
})

describe('[E2.7] fail-media', () => {
  it('[E2.7] retires the row, removes the source and the media prefix, alerts, and a cover set to it is refused media-retired', async () => {
    const t = await setup('jpg', undecodableJpeg)
    t.storage.seed('media', `${originalKey(store, mediaId, 'jpg')}`, new Uint8Array([1]))
    t.storage.seed('media', variantKey(originalKey(store, mediaId, 'jpg'), 320), new Uint8Array([1]))
    t.storage.seed('media', `${store}/other/original.jpg`, new Uint8Array([1]))

    await t.failMedia({ storeId: store, mediaId })

    expect(t.media.rows.get(mediaId)?.status).toBe('retired')
    expect(t.source()).toBe(false)
    expect(t.keys()).toEqual([`${store}/other/original.jpg`])
    expect(t.alerts).toEqual([{ storeId: store, mediaId }])
    expect(await checkMedia(t.media, tx, store, [{ id: mediaId, kind: 'image' }])).toEqual({ reason: 'media-retired' })
  })

  it('[E2.7] a second run on a retired row still runs the deletes and does not retire again', async () => {
    const t = await setup('jpg', undecodableJpeg)
    await t.failMedia({ storeId: store, mediaId })
    const retiredAt = t.media.retiredAt.get(mediaId)
    t.storage.seed('uploads', confirmedKey(store, mediaId, 'jpg'), new Uint8Array([1]))
    t.storage.seed('media', originalKey(store, mediaId, 'jpg'), new Uint8Array([1]))
    t.media.retiredAt.delete(mediaId)

    await t.failMedia({ storeId: store, mediaId })

    expect(t.media.retiredAt.has(mediaId)).toBe(false)
    expect(retiredAt).toBeDefined()
    expect(t.source()).toBe(false)
    expect(t.keys()).toEqual([])
  })
})
