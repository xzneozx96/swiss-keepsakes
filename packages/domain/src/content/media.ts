export type MediaKind = 'image' | 'audio' | 'pdf'

const MiB = 1024 * 1024

export const MEDIA_RULES = Object.freeze({
  types: Object.freeze({
    'image/jpeg': { kind: 'image', ext: 'jpg', maxBytes: 10 * MiB },
    'image/png': { kind: 'image', ext: 'png', maxBytes: 10 * MiB },
    'image/webp': { kind: 'image', ext: 'webp', maxBytes: 10 * MiB },
    'audio/mpeg': { kind: 'audio', ext: 'mp3', maxBytes: 30 * MiB },
    'application/pdf': { kind: 'pdf', ext: 'pdf', maxBytes: 25 * MiB },
  }) as Readonly<Record<string, Readonly<{ kind: MediaKind, ext: string, maxBytes: number }>>>,
  variantWidths: Object.freeze([320, 640, 1280, 1920]) as readonly number[],
  // Largest decoded image (width x height) the worker opens; sharp refuses a bigger one before it allocates.
  maxInputPixels: 70_000_000,
  abandonedUploadHours: 24,
  orphanedSourceHours: 168,
  presignExpirySeconds: 900,
})

// The rule for a content type, or undefined for a type that is not allowed. Own keys only, so names such as `constructor` are not types.
export function mediaRuleFor(contentType: string): Readonly<{ kind: MediaKind, ext: string, maxBytes: number }> | undefined {
  return Object.keys(MEDIA_RULES.types).includes(contentType) ? MEDIA_RULES.types[contentType] : undefined
}

export type UploadCheck
  = | { ok: true, kind: MediaKind, ext: string }
    | { ok: false, reason: 'type-not-allowed' | 'too-large' | 'empty' }

export function checkUploadRequest(input: { contentType: string, byteSize: number }): UploadCheck {
  const rule = mediaRuleFor(input.contentType)
  if (!rule) return { ok: false, reason: 'type-not-allowed' }
  if (!Number.isInteger(input.byteSize) || input.byteSize <= 0) return { ok: false, reason: 'empty' }
  if (input.byteSize > rule.maxBytes) return { ok: false, reason: 'too-large' }
  return { ok: true, kind: rule.kind, ext: rule.ext }
}

export type SniffedContentType = 'image/jpeg' | 'image/png' | 'image/webp' | 'audio/mpeg' | 'application/pdf'

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  return bytes.length >= offset + signature.length && signature.every((byte, i) => bytes[offset + i] === byte)
}

const PNG = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]
const RIFF = [0x52, 0x49, 0x46, 0x46]
const WEBP = [0x57, 0x45, 0x42, 0x50]
const ID3 = [0x49, 0x44, 0x33]
const PDF = [0x25, 0x50, 0x44, 0x46, 0x2D]

// Frame header: byte 0 is FF, byte 1 is 111VVLLP (version, layer), byte 2 is bitrate, sample rate, padding.
function isMp3FrameHeader(bytes: Uint8Array): boolean {
  if (bytes.length < 2 || bytes[0] !== 0xFF) return false
  const b1 = bytes[1]!
  if ((b1 & 0xE0) !== 0xE0) return false
  if (((b1 >> 3) & 3) === 1) return false // reserved version
  if (((b1 >> 1) & 3) !== 1) return false // not Layer III
  if (bytes.length >= 3) {
    const b2 = bytes[2]!
    if (b2 >> 4 === 15 || ((b2 >> 2) & 3) === 3) return false // bad bitrate or sample rate
  }
  return true
}

export function sniffContentType(bytes: Uint8Array): SniffedContentType | undefined {
  if (startsWith(bytes, [0xFF, 0xD8, 0xFF])) return 'image/jpeg'
  if (startsWith(bytes, PNG)) return 'image/png'
  if (startsWith(bytes, RIFF) && startsWith(bytes, WEBP, 8)) return 'image/webp'
  if (startsWith(bytes, ID3) || isMp3FrameHeader(bytes)) return 'audio/mpeg'
  if (startsWith(bytes, PDF)) return 'application/pdf'
  return undefined
}

export function uploadKey(storeId: string, uuid: string, ext: string): string {
  return `${storeId}/${uuid}.${ext}`
}

export function confirmedPrefix(storeId: string, mediaId: string): string {
  return `confirmed/${storeId}/${mediaId}/`
}

export function confirmedKey(storeId: string, mediaId: string, ext: string): string {
  return `${confirmedPrefix(storeId, mediaId)}source.${ext}`
}

export function originalKey(storeId: string, mediaId: string, ext: string): string {
  return `${storeId}/${mediaId}/original.${ext}`
}

export function mediaPrefix(storeId: string, mediaId: string): string {
  return `${storeId}/${mediaId}/`
}

export function variantKey(original: string, width: number): string {
  return `${original.slice(0, original.lastIndexOf('/') + 1)}w${width}.webp`
}

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const exts = [...new Set(Object.values(MEDIA_RULES.types).map(rule => rule.ext))].join('|')
const UPLOAD_KEY = new RegExp(`^(${UUID})/(${UUID})\\.(${exts})$`)

export function parseUploadKey(key: string): { storeId: string, uuid: string, ext: string } | undefined {
  const match = UPLOAD_KEY.exec(key)
  return match ? { storeId: match[1]!, uuid: match[2]!, ext: match[3]! } : undefined
}

export function variantWidthsFor(originalWidth: number): number[] {
  const fitting = MEDIA_RULES.variantWidths.filter(width => width <= originalWidth)
  if (fitting.length > 0) return fitting
  return [Math.min(originalWidth, MEDIA_RULES.variantWidths.at(-1)!)]
}
