import { describe, expect, it } from 'vitest'

import {
  checkUploadRequest,
  confirmedKey,
  cleanFileName,
  confirmedPrefix,
  defaultMediaName,
  isCurrentObject,
  MEDIA_RULES,
  mediaPrefix,
  mediaRuleFor,
  originalKey,
  parseUploadKey,
  sniffContentType,
  uploadKey,
  variantKey,
  variantWidthsFor,
  versionedKey,
} from '../src/content'

const MiB = 1024 * 1024
const storeId = '0b5f3a52-6c1e-4c53-9c0e-1d2f3a4b5c6d'
const uuid = '9f1c2d3e-4a5b-4c6d-8e7f-0a1b2c3d4e5f'

describe('[E2.7] MEDIA_RULES', () => {
  it('[E2.7][E4.11][AC51] carries the caps, widths and timings', () => {
    expect(MEDIA_RULES.types['image/jpeg']).toEqual({ kind: 'image', ext: 'jpg', maxBytes: 20 * MiB })
    expect(MEDIA_RULES.types['audio/mpeg']).toEqual({ kind: 'audio', ext: 'mp3', maxBytes: 50 * MiB })
    expect(MEDIA_RULES.types['audio/mp4']).toEqual({ kind: 'audio', ext: 'm4a', maxBytes: 50 * MiB })
    expect(MEDIA_RULES.types['application/pdf']).toEqual({ kind: 'pdf', ext: 'pdf', maxBytes: 30 * MiB })
    expect(MEDIA_RULES.variantWidths).toEqual([320, 640, 1280, 1920])
    expect(MEDIA_RULES.maxInputPixels).toBe(70_000_000)
    expect(MEDIA_RULES.abandonedUploadHours).toBe(24)
    expect(MEDIA_RULES.orphanedSourceHours).toBe(168)
    expect(MEDIA_RULES.presignExpirySeconds).toBe(900)
  })

  it('[E2.7] is frozen', () => {
    expect(Object.isFrozen(MEDIA_RULES)).toBe(true)
    expect(Object.isFrozen(MEDIA_RULES.types)).toBe(true)
    expect(Object.isFrozen(MEDIA_RULES.variantWidths)).toBe(true)
  })
})

describe('[E2.7][E4.11][AC51] checkUploadRequest', () => {
  it.each([
    ['image/jpeg', 2 * MiB, { ok: true, kind: 'image', ext: 'jpg' }],
    ['image/png', 1, { ok: true, kind: 'image', ext: 'png' }],
    ['image/webp', 1, { ok: true, kind: 'image', ext: 'webp' }],
    ['audio/mpeg', 50 * MiB, { ok: true, kind: 'audio', ext: 'mp3' }],
    ['audio/mpeg', 50 * MiB + 1, { ok: false, reason: 'too-large' }],
    ['audio/mp4', 50 * MiB, { ok: true, kind: 'audio', ext: 'm4a' }],
    ['audio/mp4', 50 * MiB + 1, { ok: false, reason: 'too-large' }],
    ['application/pdf', 1000, { ok: true, kind: 'pdf', ext: 'pdf' }],
    ['application/pdf', 30 * MiB, { ok: true, kind: 'pdf', ext: 'pdf' }],
    ['application/pdf', 30 * MiB + 1, { ok: false, reason: 'too-large' }],
    ['image/heic', 1000, { ok: false, reason: 'type-not-allowed' }],
    ['image/svg+xml', 1000, { ok: false, reason: 'type-not-allowed' }],
    ['text/html', 1000, { ok: false, reason: 'type-not-allowed' }],
    ['image/jpeg', 20 * MiB + 1, { ok: false, reason: 'too-large' }],
    ['image/jpeg', 20 * MiB, { ok: true, kind: 'image', ext: 'jpg' }],
    ['image/jpeg', 0, { ok: false, reason: 'empty' }],
    ['image/jpeg', -5, { ok: false, reason: 'empty' }],
  ])('[E2.7] %s at %i bytes', (contentType, byteSize, expected) => {
    expect(checkUploadRequest({ contentType, byteSize })).toEqual(expected)
  })

  it.each([Number.NaN, 1.5, Number.POSITIVE_INFINITY])('[E2.7] byte size %s is empty', (byteSize) => {
    expect(checkUploadRequest({ contentType: 'image/jpeg', byteSize })).toEqual({ ok: false, reason: 'empty' })
  })

  it('[E2.7] an unknown type is not looked up on the object prototype', () => {
    expect(checkUploadRequest({ contentType: 'constructor', byteSize: 10 })).toEqual({ ok: false, reason: 'type-not-allowed' })
  })
})

describe('[E2.7] sniffContentType', () => {
  const ascii = (text: string) => [...text].map(c => c.charCodeAt(0))
  it.each([
    ['image/jpeg', [0xFF, 0xD8, 0xFF, 0xE0, 0, 0x10]],
    ['image/png', [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0]],
    ['image/webp', [...ascii('RIFF'), 1, 2, 3, 4, ...ascii('WEBP'), 0]],
    ['audio/mpeg', [...ascii('ID3'), 4, 0, 0]],
    ['audio/mpeg', [0xFF, 0xFB, 0x90, 0x00]],
    ['audio/mpeg', [0xFF, 0xF3, 0x90, 0x00]],
    ['audio/mpeg', [0xFF, 0xE3, 0x90, 0x00]],
    ['application/pdf', [...ascii('%PDF-1.7')]],
    ['audio/mp4', [0, 0, 0, 0x20, ...ascii('ftypM4A '), 0, 0, 0, 0, ...ascii('M4A mp42isom')]],
    ['audio/mp4', [0, 0, 0, 0x1C, ...ascii('ftypmp42'), 0, 0, 0, 0, ...ascii('M4A '), ...ascii('isom')]],
  ])('[E2.7] recognises %s', (expected, bytes) => {
    expect(sniffContentType(new Uint8Array(bytes))).toBe(expected)
  })

  it.each([
    ['svg', '<svg xmlns="http://www.w3.org/2000/svg"/>'],
    ['shell script', '#!/bin/sh\nrm -rf /'],
    ['plain text', 'hello there'],
    ['RIFF that is not WebP', 'RIFF\u0001\u0002\u0003\u0004WAVEfmt '],
    ['empty', ''],
  ])('[E2.7] refuses %s', (_name, text) => {
    expect(sniffContentType(new Uint8Array(ascii(text)))).toBeUndefined()
  })

  it.each([
    ['UTF-16 BOM', [0xFF, 0xFE]],
    ['AAC ADTS', [0xFF, 0xF1, 0x50, 0x80]],
    ['all ones', [0xFF, 0xFF]],
    ['all ones long', [0xFF, 0xFF, 0xFF, 0xFF]],
    ['bad bitrate index', [0xFF, 0xFB, 0xFF, 0x00]],
    ['bad sample rate', [0xFF, 0xFB, 0x9C, 0x00]],
    ['reserved version', [0xFF, 0xEB, 0x90, 0x00]],
  ])('[E2.7] refuses %s as MP3', (_name, bytes) => {
    expect(sniffContentType(new Uint8Array(bytes))).toBeUndefined()
  })

  it.each([
    ['an MP4 video', [0, 0, 0, 0x18, ...ascii('ftypmp42'), 0, 0, 0, 0, ...ascii('isom')]],
    ['a short ftyp', [0, 0, 0, 0x10, ...ascii('ftyp')]],
    ['a HEIC photo', [0, 0, 0, 0x18, ...ascii('ftypheic'), 0, 0, 0, 0, ...ascii('mif1')]],
  ])('[E4.11][AC51] refuses %s as M4A', (_name, bytes) => {
    expect(sniffContentType(new Uint8Array(bytes))).toBeUndefined()
  })

  it('[E2.7] refuses a truncated header', () => {
    expect(sniffContentType(new Uint8Array([0xFF, 0xD8]))).toBeUndefined()
  })
})

describe('[E2.7] keys', () => {
  const mediaId = '1a2b3c4d-1111-4222-8333-444455556666'

  it('[E2.7] builds bucket-relative keys', () => {
    expect(uploadKey(storeId, uuid, 'jpg')).toBe(`${storeId}/${uuid}.jpg`)
    expect(confirmedKey(storeId, mediaId, 'pdf')).toBe(`confirmed/${storeId}/${mediaId}/source.pdf`)
    expect(originalKey(storeId, mediaId, 'png')).toBe(`${storeId}/${mediaId}/original.png`)
    expect(mediaPrefix(storeId, mediaId)).toBe(`${storeId}/${mediaId}/`)
  })

  it('[E2.7] derives a variant key from the original key and a width', () => {
    expect(variantKey('media/s/m/original.jpg', 640)).toBe('media/s/m/w640.webp')
    expect(variantKey(originalKey(storeId, mediaId, 'jpg'), 320)).toBe(`${storeId}/${mediaId}/w320.webp`)
  })

  it('[E2.7] parseUploadKey accepts what uploadKey made', () => {
    expect(parseUploadKey(uploadKey(storeId, uuid, 'mp3'))).toEqual({ storeId, uuid, ext: 'mp3' })
  })

  it.each([
    ['traversal', '../x'],
    ['confirmed prefix', `confirmed/${storeId}/${mediaId}/source.jpg`],
    ['wrong extension', `${storeId}/${uuid}.svg`],
    ['non-uuid store', `store/${uuid}.jpg`],
    ['non-uuid name', `${storeId}/file.jpg`],
    ['uppercase uuid', `${storeId.toUpperCase()}/${uuid}.jpg`],
    ['nested', `${storeId}/${uuid}.jpg/x`],
    ['trailing newline', `${storeId}/${uuid}.jpg\n`],
    ['empty', ''],
  ])('[E2.7] parseUploadKey refuses %s', (_name, key) => {
    expect(parseUploadKey(key)).toBeUndefined()
  })
})

describe('[E4.11][AC51] versioned keys', () => {
  const mediaId = '1a2b3c4d-1111-4222-8333-444455556666'
  const sha = 'ab12cd34ef56'.padEnd(64, '0')

  it('[E4.11][AC51] names version n by its number and the first 8 hash characters, and never reuses the first version key', () => {
    const key = versionedKey(storeId, mediaId, 2, sha, 'png')
    expect(key).toBe(`${storeId}/${mediaId}/v2-ab12cd34/original.png`)
    expect(key).not.toBe(originalKey(storeId, mediaId, 'png'))
    expect(variantKey(key, 640)).toBe(`${storeId}/${mediaId}/v2-ab12cd34/w640.webp`)
  })

  it('[E4.11][AC51] keeps the objects beside the current key and nothing else of the file', () => {
    const current = versionedKey(storeId, mediaId, 3, sha, 'jpg')
    const first = originalKey(storeId, mediaId, 'jpg')
    expect(isCurrentObject(current, variantKey(current, 320))).toBe(true)
    expect(isCurrentObject(current, current)).toBe(true)
    expect(isCurrentObject(current, first)).toBe(false)
    expect(isCurrentObject(current, versionedKey(storeId, mediaId, 2, sha, 'jpg'))).toBe(false)
    // The first version sits in the folder that holds every version: only its own files stay.
    expect(isCurrentObject(first, variantKey(first, 320))).toBe(true)
    expect(isCurrentObject(first, current)).toBe(false)
  })
})

describe('[E4.11][AC51] file names', () => {
  it.each([
    ['Kapellbruecke-Sunrise.JPG', 'Kapellbruecke-Sunrise.JPG'],
    ['  spaced name.png  ', 'spaced name.png'],
    ['C:\\Users\\me\\scan.pdf', 'scan.pdf'],
    ['/tmp/a/b/track.m4a', 'track.m4a'],
    ['line\nbreak\t.jpg', 'line break .jpg'],
  ])('[E4.11][AC51] cleans %j to %j', (raw, expected) => {
    expect(cleanFileName(raw)).toBe(expected)
  })

  it.each(['', '   ', '...', '/'])('[E4.11][AC51] gives no name for %j', (raw) => {
    expect(cleanFileName(raw)).toBeUndefined()
  })

  it('[E4.11][AC51] cuts a long name to 200 characters and keeps the extension', () => {
    const cleaned = cleanFileName(`${'a'.repeat(300)}.jpg`)!
    expect(cleaned).toHaveLength(200)
    expect(cleaned.endsWith('.jpg')).toBe(true)
  })

  it('[E4.11][AC51] a missing name falls back to the kind and the first 8 characters of the id', () => {
    expect(defaultMediaName('image', '019a3f2c-aaaa-7bbb-8ccc-dddd00000000', 'jpg')).toBe('image-019a3f2c.jpg')
  })
})

describe('[E2.7] variantWidthsFor', () => {
  it.each([
    [500, [320]],
    [5000, [320, 640, 1280, 1920]],
    [100, [100]],
    [320, [320]],
    [640, [320, 640]],
  ])('[E2.7] original width %i', (width, expected) => {
    expect(variantWidthsFor(width)).toEqual(expected)
  })
})

describe('[E2.7] media rule lookups', () => {
  it('[E2.7] mediaRuleFor finds a listed type and is undefined for anything else, including object prototype names', () => {
    expect(mediaRuleFor('application/pdf')).toEqual({ kind: 'pdf', ext: 'pdf', maxBytes: 30 * 1024 * 1024 })
    expect(mediaRuleFor('image/gif')).toBeUndefined()
    expect(mediaRuleFor('constructor')).toBeUndefined()
    expect(mediaRuleFor('__proto__')).toBeUndefined()
  })

  it('[E2.7] confirmedPrefix is the folder that holds confirmedKey, with a trailing slash', () => {
    const storeId = 's1'
    const mediaId = 'm1'
    expect(confirmedPrefix(storeId, mediaId)).toBe('confirmed/s1/m1/')
    expect(confirmedKey(storeId, mediaId, 'jpg').startsWith(confirmedPrefix(storeId, mediaId))).toBe(true)
  })
})
