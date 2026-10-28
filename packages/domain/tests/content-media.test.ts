import { describe, expect, it } from 'vitest'

import {
  checkUploadRequest,
  confirmedKey,
  MEDIA_RULES,
  mediaPrefix,
  originalKey,
  parseUploadKey,
  sniffContentType,
  uploadKey,
  variantKey,
  variantWidthsFor,
} from '../src/content'

const MiB = 1024 * 1024
const storeId = '0b5f3a52-6c1e-4c53-9c0e-1d2f3a4b5c6d'
const uuid = '9f1c2d3e-4a5b-4c6d-8e7f-0a1b2c3d4e5f'

describe('[E2.7] MEDIA_RULES', () => {
  it('[E2.7] carries the caps, widths and timings', () => {
    expect(MEDIA_RULES.types['image/jpeg']).toEqual({ kind: 'image', ext: 'jpg', maxBytes: 10 * MiB })
    expect(MEDIA_RULES.types['audio/mpeg']).toEqual({ kind: 'audio', ext: 'mp3', maxBytes: 30 * MiB })
    expect(MEDIA_RULES.types['application/pdf']).toEqual({ kind: 'pdf', ext: 'pdf', maxBytes: 25 * MiB })
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

describe('[E2.7] checkUploadRequest', () => {
  it.each([
    ['image/jpeg', 2 * MiB, { ok: true, kind: 'image', ext: 'jpg' }],
    ['image/png', 1, { ok: true, kind: 'image', ext: 'png' }],
    ['image/webp', 1, { ok: true, kind: 'image', ext: 'webp' }],
    ['audio/mpeg', 30 * MiB, { ok: true, kind: 'audio', ext: 'mp3' }],
    ['application/pdf', 1000, { ok: true, kind: 'pdf', ext: 'pdf' }],
    ['application/pdf', 25 * MiB, { ok: true, kind: 'pdf', ext: 'pdf' }],
    ['application/pdf', 25 * MiB + 1, { ok: false, reason: 'too-large' }],
    ['image/svg+xml', 1000, { ok: false, reason: 'type-not-allowed' }],
    ['text/html', 1000, { ok: false, reason: 'type-not-allowed' }],
    ['image/jpeg', 10 * MiB + 1, { ok: false, reason: 'too-large' }],
    ['image/jpeg', 10 * MiB, { ok: true, kind: 'image', ext: 'jpg' }],
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
