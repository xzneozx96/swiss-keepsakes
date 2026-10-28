import type { Actor } from '@sk/domain/identity'
import type { AuditEntry } from '../../../src/modules/content/ports.ts'
import { createHash } from 'node:crypto'
import { confirmedKey, MEDIA_RULES, originalKey } from '@sk/domain/content'
import { describe, expect, it } from 'vitest'
import { makeConfirmUpload } from '../../../src/modules/content/application/confirm-upload.ts'
import { mediaQueues } from '../../../src/modules/content/application/media-queues.ts'
import { createFakeMedia } from '../../support/fake-media.ts'
import { createFakeStorage } from '../../support/fake-storage.ts'
import { createManualClock } from '../../support/manual-clock.ts'

const store = '0190f0c2-0000-7000-8000-00000000000a'
const other = '0190f0c2-0000-7000-8000-00000000000b'
const rawId = '0190f0c2-0000-7000-8000-0000000000e1'
const mediaId = '0190f0c2-0000-7000-8000-0000000000f1'
const rawKey = `${store}/${rawId}.jpg`
const MiB = 1024 * 1024

const owner: Actor = { kind: 'staff', userId: 'u1', guestId: 'g1', stores: new Map([[store, 'owner']]) }
const elsewhere: Actor = { kind: 'staff', userId: 'u3', guestId: 'g3', stores: new Map([[other, 'owner']]) }
const guest: Actor = { kind: 'guest', userId: 'u4', guestId: 'g4' }

const jpeg = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 1, 2, 3, 4, 5, 6])
const pdf = new TextEncoder().encode('%PDF-1.4\n1 0 obj\n')
const text = new TextEncoder().encode('just some text')
const script = new TextEncoder().encode('#!/bin/sh\necho hi\n')
const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>')

interface Sent { queue: string, data: object, options: unknown }

function setup() {
  const clock = createManualClock(new Date('2026-10-28T10:00:00Z'))
  const storage = createFakeStorage(clock)
  const media = createFakeMedia()
  const sent: Sent[] = []
  const audit: AuditEntry[] = []
  const events: string[] = []
  let failJob = false
  const reads = { get: 0, head: 0 }
  const getCaps: (number | undefined)[] = []
  const realGet = storage.get
  const realHead = storage.head
  storage.get = async (...args) => {
    reads.get++
    getCaps.push(args[2])
    events.push('storage.get')
    return realGet(...args)
  }
  storage.head = async (...args) => {
    reads.head++
    events.push('storage.head')
    return realHead(...args)
  }
  const realPut = storage.put
  storage.put = async (...args) => {
    events.push('storage.put')
    return realPut(...args)
  }
  const realDelete = storage.delete
  storage.delete = async (...args) => {
    events.push('storage.delete')
    return realDelete(...args)
  }
  // A unit of work that rolls the fake rows and the queued jobs back when the work throws.
  const uow = {
    run: async <R>(work: (tx: null) => Promise<R>) => {
      events.push('uow.run')
      const rows = new Map(media.rows)
      const queued = [...sent]
      const audited = [...audit]
      try {
        return await work(null)
      }
      catch (error) {
        media.rows.clear()
        rows.forEach((row, id) => media.rows.set(id, row))
        sent.length = 0
        sent.push(...queued)
        audit.length = 0
        audit.push(...audited)
        throw error
      }
    },
  }
  const jobs = {
    send: async (_tx: null, queue: string, data: object, options?: unknown) => {
      if (failJob)
        throw new Error('queue down')
      sent.push({ queue, data, options })
    },
  }
  const confirm = makeConfirmUpload({
    uow,
    media,
    storage,
    jobs,
    audit: { record: async (_tx: null, entry: AuditEntry) => void audit.push(entry) },
    clock,
    newId: () => mediaId,
  })
  return { confirm, storage, media, sent, audit, events, reads, getCaps, failJob: () => void (failJob = true) }
}

type Setup = ReturnType<typeof setup>

const seedRaw = (s: Setup, body: Uint8Array, contentType: string | undefined, key = rawKey) => s.storage.seed('uploads', key, body, { contentType })

describe('[E2.7] confirming an upload', () => {
  it('[E2.7] a JPEG with a matching type becomes a processing row, a queued job and a confirmed source', async () => {
    const s = setup()
    seedRaw(s, jpeg, 'image/jpeg')

    const result = await s.confirm(owner, store, { uploadKey: rawKey }, 'req-1')

    expect(result).toMatchObject({ ok: true, value: { id: mediaId, storeId: store, kind: 'image', status: 'processing', contentType: 'image/jpeg', byteSize: jpeg.byteLength, width: null, height: null } })
    if (!result.ok)
      throw new Error('unreachable')
    expect(result.value.storageKey).toBe(originalKey(store, mediaId, 'jpg'))
    expect(result.value.sha256).toBe(createHash('sha256').update(jpeg).digest('hex'))
    expect(s.sent).toEqual([{ queue: mediaQueues.process, data: { storeId: store, mediaId }, options: undefined }])
    expect(mediaQueues.process).toBe('media-process')
    expect([...s.storage.objects('uploads').keys()]).toEqual([confirmedKey(store, mediaId, 'jpg')])
    expect(s.storage.objects('uploads').get(confirmedKey(store, mediaId, 'jpg'))?.body).toEqual(jpeg)
    expect(s.audit).toEqual([expect.objectContaining({ storeId: store, actor: 'staff:u1', entity: 'media', entityId: mediaId, action: 'confirmed', requestId: 'req-1' })])
  })

  it('[E2.7] a PDF is a pdf row with the pdf extension', async () => {
    const s = setup()
    const key = `${store}/${rawId}.pdf`
    seedRaw(s, pdf, 'application/pdf', key)

    const result = await s.confirm(owner, store, { uploadKey: key }, null)

    expect(result).toMatchObject({ ok: true, value: { kind: 'pdf', contentType: 'application/pdf' } })
    expect(s.storage.objects('uploads').has(confirmedKey(store, mediaId, 'pdf'))).toBe(true)
  })

  it.each([
    ['image/jpeg declared, PDF bytes', pdf, 'image/jpeg', 'content-mismatch'],
    ['image/png declared, text bytes', text, 'image/png', 'content-mismatch'],
    ['application/pdf declared, a shell script', script, 'application/pdf', 'content-mismatch'],
    ['SVG bytes declared as image/png', svg, 'image/png', 'content-mismatch'],
    ['JPEG bytes declared as image/png', jpeg, 'image/png', 'content-mismatch'],
    ['a type that is not allowed', jpeg, 'image/svg+xml', 'type-not-allowed'],
    ['no declared type', jpeg, undefined, 'type-not-allowed'],
    ['0 bytes', new Uint8Array(0), 'image/jpeg', 'empty'],
  ] as const)('[E2.7] refuses %s, deletes the raw upload and leaves no row and no job', async (_name, body, declared, reason) => {
    const s = setup()
    seedRaw(s, body, declared)

    const result = await s.confirm(owner, store, { uploadKey: rawKey }, null)

    expect(result).toEqual({ ok: false, reason })
    expect(s.storage.objects('uploads').size).toBe(0)
    expect(s.media.rows.size).toBe(0)
    expect(s.sent).toEqual([])
    expect(s.audit).toEqual([])
  })

  it('[E2.7] an object one byte over the cap of its type is too-large, refused from its size and deleted', async () => {
    const s = setup()
    const big = new Uint8Array(MEDIA_RULES.types['image/jpeg']!.maxBytes + 1)
    big.set(jpeg)
    seedRaw(s, big, 'image/jpeg')

    const result = await s.confirm(owner, store, { uploadKey: rawKey }, null)

    expect(result).toEqual({ ok: false, reason: 'too-large' })
    expect(s.reads.get).toBe(0)
    expect(s.storage.objects('uploads').size).toBe(0)
    expect(s.media.rows.size).toBe(0)
  })

  // The head said the object is in the cap; what the get returns is what the checks must catch.
  describe('the bytes that come back from the get', () => {
    const refused = (s: Setup) => {
      expect(s.storage.objects('uploads').has(rawKey)).toBe(false)
      expect(s.media.rows.size).toBe(0)
      expect(s.sent).toEqual([])
      expect(s.audit).toEqual([])
    }

    it('[E2.7] one byte over the cap, though the head was in the cap, is too-large and the raw upload is deleted', async () => {
      const s = setup()
      seedRaw(s, jpeg, 'image/jpeg')
      const big = new Uint8Array(MEDIA_RULES.types['image/jpeg']!.maxBytes + 1)
      big.set(jpeg)
      s.storage.get = async () => big

      expect(await s.confirm(owner, store, { uploadKey: rawKey }, null)).toEqual({ ok: false, reason: 'too-large' })
      refused(s)
    })

    it('[E2.7] 0 bytes, though the head was not empty, is empty and the raw upload is deleted', async () => {
      const s = setup()
      seedRaw(s, jpeg, 'image/jpeg')
      s.storage.get = async () => new Uint8Array(0)

      expect(await s.confirm(owner, store, { uploadKey: rawKey }, null)).toEqual({ ok: false, reason: 'empty' })
      refused(s)
    })

    it('[E2.7] nothing, though the head found the object, is upload-missing', async () => {
      const s = setup()
      seedRaw(s, jpeg, 'image/jpeg')
      s.storage.get = async () => undefined

      expect(await s.confirm(owner, store, { uploadKey: rawKey }, null)).toEqual({ ok: false, reason: 'upload-missing' })
      expect(s.media.rows.size).toBe(0)
      expect(s.sent).toEqual([])
    })

    it('[E2.7] the cap of the declared type goes to the storage, which refuses a larger object before reading it: too-large', async () => {
      const s = setup()
      const grown = new Uint8Array(MEDIA_RULES.types['image/jpeg']!.maxBytes + 1)
      grown.set(jpeg)
      seedRaw(s, grown, 'image/jpeg')
      // The head saw a small object; the object grew before the get.
      s.storage.head = async key => ({ key, size: jpeg.byteLength, contentType: 'image/jpeg', lastModified: new Date() })

      expect(await s.confirm(owner, store, { uploadKey: rawKey }, null)).toEqual({ ok: false, reason: 'too-large' })
      expect(s.getCaps).toEqual([MEDIA_RULES.types['image/jpeg']!.maxBytes])
      refused(s)
    })

    it('[E2.7] a storage error that is not about size surfaces and nothing is deleted', async () => {
      const s = setup()
      seedRaw(s, jpeg, 'image/jpeg')
      s.storage.get = async () => {
        throw new Error('boom')
      }

      await expect(s.confirm(owner, store, { uploadKey: rawKey }, null)).rejects.toThrow('boom')
      expect(s.storage.objects('uploads').has(rawKey)).toBe(true)
    })
  })

  it('[E2.7] an object exactly at the cap is accepted', async () => {
    const s = setup()
    const full = new Uint8Array(10 * MiB)
    full.set(jpeg)
    seedRaw(s, full, 'image/jpeg')

    expect(await s.confirm(owner, store, { uploadKey: rawKey }, null)).toMatchObject({ ok: true, value: { byteSize: 10 * MiB } })
  })

  it.each([
    ['the key of another store', `${other}/${rawId}.jpg`],
    ['a ".." key', `${store}/../x`],
    ['a confirmed/ key', confirmedKey(store, mediaId, 'jpg')],
    ['a key with a path under the store', `${store}/${rawId}/x.jpg`],
    ['a key with an unknown extension', `${store}/${rawId}.svg`],
    ['an empty key', ''],
  ])('[E2.7] %s is upload-missing and storage is never read', async (_name, key) => {
    const s = setup()
    seedRaw(s, jpeg, 'image/jpeg', `${other}/${rawId}.jpg`)
    seedRaw(s, jpeg, 'image/jpeg', confirmedKey(store, mediaId, 'jpg'))

    const result = await s.confirm(owner, store, { uploadKey: key }, null)

    expect(result).toEqual({ ok: false, reason: 'upload-missing' })
    expect(s.reads).toEqual({ get: 0, head: 0 })
    expect(s.storage.objects('uploads').size).toBe(2)
    expect(s.media.rows.size).toBe(0)
  })

  it('[E2.7] a key that was never uploaded is upload-missing', async () => {
    const s = setup()

    expect(await s.confirm(owner, store, { uploadKey: rawKey }, null)).toEqual({ ok: false, reason: 'upload-missing' })
    expect(s.sent).toEqual([])
  })

  it('[E2.7] the same key confirmed twice: the second is upload-missing and there is one row and one job', async () => {
    const s = setup()
    seedRaw(s, jpeg, 'image/jpeg')

    const first = await s.confirm(owner, store, { uploadKey: rawKey }, null)
    const second = await s.confirm(owner, store, { uploadKey: rawKey }, null)

    expect(first.ok).toBe(true)
    expect(second).toEqual({ ok: false, reason: 'upload-missing' })
    expect(s.media.rows.size).toBe(1)
    expect(s.sent).toHaveLength(1)
  })

  it('[E2.7] a guest and staff of another store are forbidden before anything is read', async () => {
    const s = setup()
    seedRaw(s, jpeg, 'image/jpeg')

    expect(await s.confirm(guest, store, { uploadKey: rawKey }, null)).toEqual({ ok: false, reason: 'forbidden' })
    expect(await s.confirm(elsewhere, store, { uploadKey: rawKey }, null)).toEqual({ ok: false, reason: 'forbidden' })
    expect(s.reads).toEqual({ get: 0, head: 0 })
    expect(s.storage.objects('uploads').has(rawKey)).toBe(true)
  })

  it('[E2.7] all storage reads and writes happen before the transaction', async () => {
    const s = setup()
    seedRaw(s, jpeg, 'image/jpeg')

    await s.confirm(owner, store, { uploadKey: rawKey }, null)

    expect(s.events).toEqual(['storage.head', 'storage.get', 'storage.put', 'storage.delete', 'uow.run'])
  })

  it('[E2.7] a failing job send rolls the row back with the job, and the confirmed source stays for the sweep', async () => {
    const s = setup()
    seedRaw(s, jpeg, 'image/jpeg')
    s.failJob()

    await expect(s.confirm(owner, store, { uploadKey: rawKey }, null)).rejects.toThrow('queue down')

    expect(s.media.rows.size).toBe(0)
    expect(s.sent).toEqual([])
    expect(s.audit).toEqual([])
    expect([...s.storage.objects('uploads').keys()]).toEqual([confirmedKey(store, mediaId, 'jpg')])
  })
})
