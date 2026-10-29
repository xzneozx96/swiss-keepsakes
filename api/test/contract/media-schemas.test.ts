import { confirmUploadSchema, MEDIA_NAME_MAX, mediaItemSchema, mediaListQuerySchema, mediaPatchBodySchema, problemTypes, replaceMediaBodySchema, uploadRequestSchema } from '@sk/api-contract'
import { describe, expect, it } from 'vitest'

const id = '3f1c1d0e-8a57-4c0e-9b8e-5d0f6a7b1c2d'
const ok = (schema: { safeParse: (v: unknown) => { success: boolean } }, value: unknown) => schema.safeParse(value).success

describe('[E4.11][AC51] media library schemas', () => {
  it('[E4.11][AC51] a blank or too long name is refused and a name is trimmed', () => {
    expect(ok(mediaPatchBodySchema, { name: '' })).toBe(false)
    expect(ok(mediaPatchBodySchema, { name: '   ' })).toBe(false)
    expect(ok(mediaPatchBodySchema, { name: 'x'.repeat(MEDIA_NAME_MAX + 1) })).toBe(false)
    expect(mediaPatchBodySchema.parse({ name: '  Bridge at dawn ' })).toEqual({ name: 'Bridge at dawn' })
  })

  it('[E4.11][AC51] the refusal for a blank name says what to do', () => {
    const result = mediaPatchBodySchema.safeParse({ name: ' ' })
    expect(result.success ? '' : result.error.issues[0]!.message).toBe('Give the file a name.')
  })

  it('[E4.11][AC51] a patch needs a name or a description and takes nothing else', () => {
    expect(ok(mediaPatchBodySchema, {})).toBe(false)
    expect(ok(mediaPatchBodySchema, { alt: { en: 'The Chapel Bridge' } })).toBe(true)
    expect(ok(mediaPatchBodySchema, { alt: { de: '' } })).toBe(true)
    expect(ok(mediaPatchBodySchema, { name: 'a', status: 'ready' })).toBe(false)
    expect(ok(mediaPatchBodySchema, { alt: { fr: 'x' } })).toBe(false)
  })

  it('[E4.11][AC51] the list query has defaults, splits the filters and refuses unknown values', () => {
    expect(mediaListQuerySchema.parse({})).toEqual({ kind: 'image', use: [], status: [], page: 1, pageSize: 10 })
    expect(mediaListQuerySchema.parse({ kind: 'pdf', use: 'unused,drafts', status: 'ready', page: '2', pageSize: '24', q: ' sun ' }))
      .toEqual({ kind: 'pdf', q: 'sun', use: ['unused', 'drafts'], status: ['ready'], page: 2, pageSize: 24 })
    expect(ok(mediaListQuerySchema, { kind: 'video' })).toBe(false)
    expect(ok(mediaListQuerySchema, { use: 'unused,never' })).toBe(false)
    expect(ok(mediaListQuerySchema, { pageSize: '101' })).toBe(false)
    expect(ok(mediaListQuerySchema, { page: '0' })).toBe(false)
  })

  it('[E4.11][AC51] confirm and replace take an optional file name and nothing else', () => {
    expect(ok(confirmUploadSchema, { uploadKey: 'a/b.jpg', fileName: 'Bridge.JPG' })).toBe(true)
    expect(ok(confirmUploadSchema, { uploadKey: 'a/b.jpg' })).toBe(true)
    expect(ok(confirmUploadSchema, { uploadKey: 'a/b.jpg', name: 'x' })).toBe(false)
    expect(ok(replaceMediaBodySchema, { uploadKey: 'a/b.jpg' })).toBe(true)
    expect(ok(replaceMediaBodySchema, { uploadKey: '' })).toBe(false)
  })

  it('[E4.11][AC51] an upload request for an M4A has a type the schema lets through', () => {
    expect(ok(uploadRequestSchema, { contentType: 'audio/mp4', byteSize: 10 })).toBe(true)
  })

  it('[E4.11][AC51] an item carries the name, version and use', () => {
    const item = {
      id, kind: 'image', status: 'ready', contentType: 'image/jpeg', byteSize: 10, width: 100, height: 50, publicUrl: 'https://x/y.jpg', variants: [],
      name: 'a.jpg', fileName: 'a.jpg', alt: {}, durationSeconds: null, version: 2, createdAt: '2026-10-30T00:00:00.000Z', usage: { pages: 3, published: 2, drafts: 1 },
    }
    expect(ok(mediaItemSchema, item)).toBe(true)
    expect(ok(mediaItemSchema, { ...item, name: undefined })).toBe(false)
  })

  it('[E4.11][AC51] the new problem codes are listed', () => {
    expect(problemTypes).toEqual(expect.arrayContaining(['media-in-use', 'media-already-retired', 'media-not-ready', 'media-kind-mismatch']))
  })
})
