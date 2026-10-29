import { describe, expect, it } from 'vitest'

import { checkFile, contentTypeOf, duration, fileSize, retireCheck, thumbOf } from '@/features/media/lib/rules'
import { pageSizeOf, parseMediaSearch } from '@/features/media/lib/search-params'
import { item } from './media-harness'

const MiB = 1024 * 1024
const file = (name: string, type: string, size: number) => ({ name, type, size })

describe('[E4.11][AC51] upload checks', () => {
  it.each([
    ['photo.jpg', 'image/jpeg', 20 * MiB, { ok: true, kind: 'image', contentType: 'image/jpeg' }],
    ['photo.jpg', 'image/jpeg', 20 * MiB + 1, { ok: false, reason: 'size', maxMb: 20 }],
    ['talk.mp3', 'audio/mpeg', 50 * MiB, { ok: true, kind: 'audio', contentType: 'audio/mpeg' }],
    ['talk.mp3', 'audio/mpeg', 50 * MiB + 1, { ok: false, reason: 'size', maxMb: 50 }],
    ['walk.m4a', 'audio/x-m4a', 1000, { ok: true, kind: 'audio', contentType: 'audio/mp4' }],
    ['walk.m4a', '', 1000, { ok: true, kind: 'audio', contentType: 'audio/mp4' }],
    ['guide.pdf', 'application/pdf', 30 * MiB, { ok: true, kind: 'pdf', contentType: 'application/pdf' }],
    ['guide.pdf', 'application/pdf', 30 * MiB + 1, { ok: false, reason: 'size', maxMb: 30 }],
    ['IMG_1.heic', 'image/heic', 1000, { ok: false, reason: 'type' }],
    ['notes.txt', 'text/plain', 1000, { ok: false, reason: 'type' }],
    ['empty.jpg', 'image/jpeg', 0, { ok: false, reason: 'type' }],
  ])('[E4.11][AC51] %s (%s, %i bytes)', (name, type, size, expected) => {
    expect(checkFile(file(name, type, size))).toEqual(expected)
  })

  it('[E4.11][AC51] checks the type before the size', () => {
    expect(checkFile(file('big.heic', 'image/heic', 900 * MiB))).toEqual({ ok: false, reason: 'type' })
  })

  it('[E4.11][AC51] only an .m4a file is renamed to audio/mp4', () => {
    expect(contentTypeOf(file('x.mp3', '', 1))).toBe('')
    expect(contentTypeOf(file('X.M4A', 'audio/m4a', 1))).toBe('audio/mp4')
  })
})

describe('[E4.11][AC51] library rules', () => {
  it('[E4.11][AC51] sizes show MB from 1,000,000 bytes and KB below, and a duration is m:ss', () => {
    expect(fileSize(3_200_000, 'en-CH')).toBe('3.2 MB')
    expect(fileSize(820_000, 'en-CH')).toBe('820 KB')
    expect(fileSize(1, 'en-CH')).toBe('1 KB')
    expect(duration(13)).toBe('0:13')
    expect(duration(605)).toBe('10:05')
  })

  it('[E4.11][AC51] names the retire reason in the API order: retired, processing, in use', () => {
    const used = { pages: 2, published: 1, drafts: 1 }

    expect(retireCheck(item({ status: 'retired', usage: used }))).toEqual({ ok: false, reason: 'retired', pages: 2 })
    expect(retireCheck(item({ status: 'processing', usage: used }))).toEqual({ ok: false, reason: 'processing', pages: 2 })
    expect(retireCheck(item({ usage: used }))).toEqual({ ok: false, reason: 'in-use', pages: 2 })
    expect(retireCheck(item({ usage: { pages: 0, published: 0, drafts: 0 } }))).toEqual({ ok: true })
  })

  it('[E4.11][AC51] a thumbnail is the smallest variant that fits, else the largest, else the original', () => {
    const variants = [{ width: 320, url: 'a' }, { width: 640, url: 'b' }]

    expect(thumbOf({ variants, publicUrl: 'o' }, 320)).toBe('a')
    expect(thumbOf({ variants, publicUrl: 'o' }, 640)).toBe('b')
    expect(thumbOf({ variants, publicUrl: 'o' }, 1280)).toBe('b')
    expect(thumbOf({ variants: [], publicUrl: 'o' })).toBe('o')
  })

  it('[E4.11][AC51] the address keeps only what it knows, and a page is 24 on the wall and 10 in the lists', () => {
    expect(parseMediaSearch({ kind: 'pdf', q: ' sun ', use: 'unused,never', status: ['ready', 'x'], page: '3' })).toEqual({ kind: 'pdf', q: ' sun ', use: ['unused'], status: ['ready'], page: 3 })
    expect(parseMediaSearch({ kind: 'video', q: '  ', page: '0' })).toEqual({ kind: undefined, q: undefined, use: undefined, status: undefined, page: undefined })
    expect(pageSizeOf('image')).toBe(24)
    expect(pageSizeOf('audio')).toBe(10)
  })
})
