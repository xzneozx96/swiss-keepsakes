import type { MediaKind } from '@sk/domain/content'
import type { ObjectStorage } from '../ports.ts'
import { MEDIA_RULES, variantKey, variantWidthsFor } from '@sk/domain/content'
import sharp from 'sharp'

export const MEDIA_CACHE_CONTROL = 'public, max-age=31536000, immutable'

const formats = { 'image/jpeg': 'jpeg', 'image/png': 'png', 'image/webp': 'webp' } as const

// Writes the public files of one verified upload under `storageKey` in the `media` bucket and returns the image size
// (none for audio and PDF). Images are re-encoded after rotate() with no metadata (sharp drops it by default), so a
// public file never carries GPS. Variants are WebP, cut from the oriented image, never enlarged. Every put overwrites
// the same keys, so a retry repeats safely. The process job and the replace use case both call it.
export async function buildMediaObjects(
  storage: ObjectStorage,
  file: { kind: MediaKind, contentType: string, storageKey: string, source: Uint8Array },
  maxInputPixels: number = MEDIA_RULES.maxInputPixels,
): Promise<{ width: number, height: number } | undefined> {
  const headers = { cacheControl: MEDIA_CACHE_CONTROL, ...(file.kind === 'pdf' && { contentDisposition: 'inline' }) }
  if (file.kind !== 'image') {
    await storage.put('media', file.storageKey, file.source, { contentType: file.contentType, ...headers })
    return undefined
  }
  const open = (bytes: Uint8Array) => sharp(bytes, { limitInputPixels: maxInputPixels })
  const format = formats[file.contentType as keyof typeof formats]
  const { data, info } = await open(file.source).rotate().toFormat(format).toBuffer({ resolveWithObject: true })
  await storage.put('media', file.storageKey, data, { contentType: file.contentType, ...headers })
  for (const width of variantWidthsFor(info.width)) {
    const variant = await open(data).resize({ width, withoutEnlargement: true }).webp().toBuffer()
    await storage.put('media', variantKey(file.storageKey, width), variant, { contentType: 'image/webp', ...headers })
  }
  return { width: info.width, height: info.height }
}
