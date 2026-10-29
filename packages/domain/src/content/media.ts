export type MediaKind = 'image' | 'audio' | 'pdf'

const MiB = 1024 * 1024

// The upload limits of the media library design (docs/ux/media-design.md section 5). They are proposals the owner
// has not confirmed yet, so each is a named constant.
export const PHOTO_MAX_BYTES = 20 * MiB
export const AUDIO_MAX_BYTES = 50 * MiB
export const PDF_MAX_BYTES = 30 * MiB

export const MEDIA_RULES = Object.freeze({
  types: Object.freeze({
    'image/jpeg': { kind: 'image', ext: 'jpg', maxBytes: PHOTO_MAX_BYTES },
    'image/png': { kind: 'image', ext: 'png', maxBytes: PHOTO_MAX_BYTES },
    'image/webp': { kind: 'image', ext: 'webp', maxBytes: PHOTO_MAX_BYTES },
    'audio/mpeg': { kind: 'audio', ext: 'mp3', maxBytes: AUDIO_MAX_BYTES },
    'audio/mp4': { kind: 'audio', ext: 'm4a', maxBytes: AUDIO_MAX_BYTES },
    'application/pdf': { kind: 'pdf', ext: 'pdf', maxBytes: PDF_MAX_BYTES },
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

export type SniffedContentType = 'image/jpeg' | 'image/png' | 'image/webp' | 'audio/mpeg' | 'audio/mp4' | 'application/pdf'

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

const M4A_BRANDS = ['M4A ', 'M4B ']

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + length))
}

// An M4A file starts with an `ftyp` box whose major or compatible brand is M4A. A video MP4 or a HEIC photo has
// the same box with other brands.
function isM4a(bytes: Uint8Array): boolean {
  if (bytes.length < 12 || ascii(bytes, 4, 4) !== 'ftyp') return false
  const size = (bytes[0]! * 2 ** 24) + (bytes[1]! << 16) + (bytes[2]! << 8) + bytes[3]!
  const end = Math.min(bytes.length, size)
  if (M4A_BRANDS.includes(ascii(bytes, 8, 4))) return true
  // Compatible brands follow the major brand and its version, four bytes each.
  for (let at = 16; at + 4 <= end; at += 4) {
    if (M4A_BRANDS.includes(ascii(bytes, at, 4))) return true
  }
  return false
}

export function sniffContentType(bytes: Uint8Array): SniffedContentType | undefined {
  if (startsWith(bytes, [0xFF, 0xD8, 0xFF])) return 'image/jpeg'
  if (startsWith(bytes, PNG)) return 'image/png'
  if (startsWith(bytes, RIFF) && startsWith(bytes, WEBP, 8)) return 'image/webp'
  if (startsWith(bytes, ID3) || isMp3FrameHeader(bytes)) return 'audio/mpeg'
  if (startsWith(bytes, PDF)) return 'application/pdf'
  if (isM4a(bytes)) return 'audio/mp4'
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

// Version 1 keeps the key it was made with. A replacement writes a new folder named by its version and the start of
// its hash, so two replacements that race never write the same key (ADR-004: a key is never overwritten).
export function versionedKey(storeId: string, mediaId: string, version: number, sha256: string, ext: string): string {
  return `${storeId}/${mediaId}/v${version}-${sha256.slice(0, 8)}/original.${ext}`
}

// True for the key itself and the files beside it (the variants). The first version sits in the folder that holds
// every version, so only the files directly in that folder count.
export function isCurrentObject(currentKey: string, key: string): boolean {
  return key.slice(0, key.lastIndexOf('/')) === currentKey.slice(0, currentKey.lastIndexOf('/'))
}

const MAX_NAME_LENGTH = 200

// The name a merchant sees for an upload: the file name without its folder, with control characters turned into
// spaces, at most 200 characters (the end is kept, so the extension stays). undefined when nothing is left.
export function cleanFileName(raw: string): string | undefined {
  // eslint-disable-next-line no-control-regex
  const flat = raw.replaceAll(/[\u0000-\u001F\u007F]/g, ' ')
  const base = flat.slice(Math.max(flat.lastIndexOf('/'), flat.lastIndexOf('\\')) + 1).trim()
  if (base.replaceAll('.', '') === '') return undefined
  return base.length > MAX_NAME_LENGTH ? base.slice(base.length - MAX_NAME_LENGTH) : base
}

export function defaultMediaName(kind: MediaKind, mediaId: string, ext: string): string {
  return `${kind}-${mediaId.slice(0, 8)}.${ext}`
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
