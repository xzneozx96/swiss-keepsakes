import type { Actor } from '@sk/domain/identity'
import type { AuditEntry, KeepsakeUse, MediaLibrary, MediaRecord, MediaUseRow } from '../../../src/modules/content/ports.ts'
import { isCurrentObject, originalKey, variantKey, versionedKey } from '@sk/domain/content'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { makeConfirmUpload } from '../../../src/modules/content/application/confirm-upload.ts'
import { makeDescribeMedia } from '../../../src/modules/content/application/describe-media.ts'
import { makeListMedia } from '../../../src/modules/content/application/list-media.ts'
import { mediaQueues } from '../../../src/modules/content/application/media-queues.ts'
import { makePurgeOldVersions, makeReplaceMedia } from '../../../src/modules/content/application/replace-media.ts'
import { makeRetireLibraryMedia } from '../../../src/modules/content/application/retire-library-media.ts'
import { createFakeMedia, mediaDefaults } from '../../support/fake-media.ts'
import { createFakeStorage } from '../../support/fake-storage.ts'
import { createManualClock } from '../../support/manual-clock.ts'

const store = '0190f0c2-0000-7000-8000-00000000000a'
const other = '0190f0c2-0000-7000-8000-00000000000b'
const mediaId = '0190f0c2-0000-7000-8000-0000000000f1'
const rawId = '0190f0c2-0000-7000-8000-0000000000e1'
const otherRawId = '0190f0c2-0000-7000-8000-0000000000e2'
const tx = null

const owner: Actor = { kind: 'staff', userId: 'u1', guestId: 'g1', stores: new Map([[store, 'owner']]) }
const elsewhere: Actor = { kind: 'staff', userId: 'u3', guestId: 'g3', stores: new Map([[other, 'owner']]) }
const guest: Actor = { kind: 'guest', userId: 'u4', guestId: 'g4' }

const png = (colour: string) => sharp({ create: { width: 40, height: 30, channels: 3, background: colour } }).png().toBuffer().then(buffer => new Uint8Array(buffer))
const pdf = new TextEncoder().encode('%PDF-1.4\n1 0 obj\n')

function row(overrides: Partial<MediaRecord> = {}): MediaRecord {
  return {
    id: mediaId,
    storeId: store,
    kind: 'image',
    contentType: 'image/png',
    storageKey: originalKey(store, mediaId, 'png'),
    byteSize: 10,
    sha256: 'a'.repeat(64),
    width: 40,
    height: 30,
    status: 'ready',
    ...mediaDefaults,
    name: 'Chapel Bridge.png',
    fileName: 'chapel-bridge.png',
    ...overrides,
  }
}

function setup(seed: MediaRecord[] = [row()]) {
  const clock = createManualClock(new Date('2026-10-30T10:00:00Z'))
  const storage = createFakeStorage(clock)
  const media = createFakeMedia(seed)
  const audit: AuditEntry[] = []
  const sent: { queue: string, data: object, options?: { startAfter?: Date } }[] = []
  const keepsakes = {
    uses: [] as KeepsakeUse[],
    asked: 0,
    list: async () => {
      keepsakes.asked++

      return keepsakes.uses
    },
  }
  const pages: MediaUseRow[] = []
  const library: MediaLibrary<null> = {
    list: async (_tx, _store, _query, held) => ({ rows: [], total: held.length, kinds: { image: 0, audio: 0, pdf: 0 }, uses: { unused: 0, drafts: 0, published: 0 }, statuses: { processing: 0, ready: 0, retired: 0 } }),
    usesOf: async (_tx, _store, id, held) => [
      ...pages,
      ...held.filter(use => use.mediaId === id).map((use): MediaUseRow => ({ pageKind: 'keepsake', pageId: use.productId, language: null, title: use.name, role: 'photo', published: use.published, thumbnailMediaId: null })),
    ],
    thumbnails: async () => new Map(),
  }
  const uow = { run: <R>(work: (t: null) => Promise<R>) => work(tx) }
  const auditLog = { record: async (_tx: null, entry: AuditEntry) => void audit.push(entry) }
  const jobs = { send: async (_tx: null, queue: string, data: object, options?: { startAfter?: Date }) => void sent.push({ queue, data, options }) }
  return {
    clock,
    storage,
    media,
    audit,
    sent,
    keepsakes,
    pages,
    uow,
    describe: makeDescribeMedia({ uow, media, audit: auditLog, clock }),
    retire: makeRetireLibraryMedia({ uow, media, library, keepsakes, jobs, audit: auditLog, clock, graceHours: 24 }),
    replace: makeReplaceMedia({ uow, media, storage, jobs, audit: auditLog, clock, graceHours: 24 }),
    purge: makePurgeOldVersions({ uow, media, storage, clock }),
    list: makeListMedia({ uow, library, keepsakes }),
    confirm: makeConfirmUpload({ uow, media, storage, jobs, audit: auditLog, clock, newId: () => mediaId }),
  }
}

type Setup = ReturnType<typeof setup>
function seedRaw(s: Setup, body: Uint8Array, contentType: string, ext = 'png') {
  const key = `${store}/${rawId}.${ext}`
  s.storage.seed('uploads', key, body, { contentType })
  return key
}
const usedBy = (overrides: Partial<MediaUseRow> = {}): MediaUseRow => ({ pageKind: 'story', pageId: 'g1', language: 'en', title: { en: 'Lucerne in one day' }, role: 'cover', published: false, thumbnailMediaId: null, ...overrides })

describe('[E4.11][AC51] naming a file', () => {
  it('[E4.11][AC51] the uploaded file name becomes the name and the uploaded-as name', async () => {
    const s = setup([])
    const key = seedRaw(s, await png('red'), 'image/png')
    const result = await s.confirm(owner, store, { uploadKey: key, fileName: 'C:\\Photos\\Kapellbruecke-Sunrise.PNG' }, null)
    expect(result).toMatchObject({ ok: true, value: { name: 'Kapellbruecke-Sunrise.PNG', fileName: 'Kapellbruecke-Sunrise.PNG', version: 1 } })
  })

  it.each([undefined, '', '   ', '...'])('[E4.11][AC51] a missing or blank file name (%j) falls back to the default name', async (fileName) => {
    const s = setup([])
    const key = seedRaw(s, await png('red'), 'image/png')
    const result = await s.confirm(owner, store, { uploadKey: key, ...(fileName !== undefined && { fileName }) }, null)
    expect(result).toMatchObject({ ok: true, value: { name: `image-${mediaId.slice(0, 8)}.png` } })
  })

  it('[E4.11][AC51] a rename keeps the uploaded-as name and the other language of the description', async () => {
    const s = setup([row({ alt: { de: 'Die Kapellbrücke' } })])
    const result = await s.describe(owner, store, mediaId, { name: 'Bridge at dawn', alt: { en: 'The Chapel Bridge' } }, 'req-1')
    expect(result).toMatchObject({ ok: true, value: { name: 'Bridge at dawn', fileName: 'chapel-bridge.png', alt: { de: 'Die Kapellbrücke', en: 'The Chapel Bridge' } } })
    expect(s.audit.map(entry => entry.action)).toEqual(['described'])
  })

  it('[E4.11][AC51] an empty description text clears that language and nothing else', async () => {
    const s = setup([row({ alt: { en: 'a', de: 'b' } })])
    expect(await s.describe(owner, store, mediaId, { alt: { de: '' } }, null)).toMatchObject({ ok: true, value: { name: 'Chapel Bridge.png', alt: { en: 'a' } } })
  })

  it('[E4.11][AC51] a retired file is read-only and a file of another store is not found', async () => {
    const s = setup([row({ status: 'retired' })])
    expect(await s.describe(owner, store, mediaId, { name: 'x' }, null)).toEqual({ ok: false, reason: 'media-already-retired' })
    expect(await s.describe(elsewhere, other, mediaId, { name: 'x' }, null)).toEqual({ ok: false, reason: 'not-found' })
    expect(await s.describe(guest, store, mediaId, { name: 'x' }, null)).toEqual({ ok: false, reason: 'forbidden' })
  })
})

describe('[E4.11][AC51] retiring a file', () => {
  it('[E4.11][AC51] an unused ready file is retired and its objects are cleaned up after the grace period', async () => {
    const s = setup()
    const result = await s.retire(owner, store, mediaId, 'req-1')
    expect(result).toMatchObject({ ok: true, value: { status: 'retired' } })
    expect(s.sent).toEqual([{ queue: mediaQueues.retire, data: { storeId: store, mediaId }, options: { startAfter: new Date('2026-10-31T10:00:00Z') } }])
    expect(s.audit.map(entry => entry.action)).toEqual(['retired'])
  })

  it.each([
    ['a published story', usedBy({ published: true })],
    ['a draft story', usedBy()],
    ['a place', usedBy({ pageKind: 'place', language: null, title: { en: 'Chapel Bridge' } })],
    ['a tour', usedBy({ pageKind: 'tour', language: null, role: 'pdf', title: { en: 'Old Town walk' } })],
  ])('[E4.11][AC51] is refused while %s uses the file, with the page count', async (_name, page) => {
    const s = setup()
    s.pages.push(page, usedBy({ language: 'de' }))
    expect(await s.retire(owner, store, mediaId, null)).toEqual({ ok: false, reason: 'media-in-use', pages: 2 })
    expect(s.media.rows.get(mediaId)?.status).toBe('ready')
    expect(s.sent).toEqual([])
  })

  it.each([true, false])('[E4.11][AC51] is refused while a keepsake photo uses the file (published: %s) and the catalog is asked inside the check', async (published) => {
    const s = setup()
    s.keepsakes.uses.push({ mediaId, productId: 'p1', name: { en: 'Fondue set' }, published, coverMediaId: null })
    expect(await s.retire(owner, store, mediaId, null)).toEqual({ ok: false, reason: 'media-in-use', pages: 1 })
    expect(s.keepsakes.asked).toBe(1)
    expect(s.media.rows.get(mediaId)?.status).toBe('ready')
  })

  it('[E4.11][AC51] a keepsake photo of another file does not block it', async () => {
    const s = setup()
    s.keepsakes.uses.push({ mediaId: 'other-file', productId: 'p1', name: {}, published: true, coverMediaId: null })
    expect(await s.retire(owner, store, mediaId, null)).toMatchObject({ ok: true })
  })

  it('[E4.11][AC51] names the reason in order: retired, then processing, then in use', async () => {
    const retired = setup([row({ status: 'retired' })])
    retired.pages.push(usedBy())
    expect(await retired.retire(owner, store, mediaId, null)).toEqual({ ok: false, reason: 'media-already-retired' })
    const processing = setup([row({ status: 'processing' })])
    processing.pages.push(usedBy())
    expect(await processing.retire(owner, store, mediaId, null)).toEqual({ ok: false, reason: 'media-not-ready' })
  })

  it('[E4.11][AC51] a guest, staff of another store and an unknown file get forbidden or not-found', async () => {
    const s = setup()
    expect(await s.retire(guest, store, mediaId, null)).toEqual({ ok: false, reason: 'forbidden' })
    expect(await s.retire(elsewhere, store, mediaId, null)).toEqual({ ok: false, reason: 'forbidden' })
    expect(await s.retire(owner, store, rawId, null)).toEqual({ ok: false, reason: 'not-found' })
  })

  it('[E4.11][AC51] the list passes the keepsakes of the store to the library', async () => {
    const s = setup()
    s.keepsakes.uses.push({ mediaId, productId: 'p1', name: {}, published: true, coverMediaId: null })
    const result = await s.list(owner, store, { kind: 'image', use: [], status: [], page: 1, pageSize: 10 })
    expect(result).toMatchObject({ ok: true, value: { total: 1 } })
    expect(await s.list(guest, store, { kind: 'image', use: [], status: [], page: 1, pageSize: 10 })).toEqual({ ok: false, reason: 'forbidden' })
  })
})

describe('[E4.11][AC51] replacing a file', () => {
  it('[E4.11][AC51] keeps the row, moves it to a new versioned key and leaves the old objects for the grace period', async () => {
    const s = setup()
    s.storage.seed('media', originalKey(store, mediaId, 'png'), await png('red'))
    s.storage.seed('media', variantKey(originalKey(store, mediaId, 'png'), 320), new Uint8Array([1]))
    const next = await png('blue')
    const key = seedRaw(s, next, 'image/png')

    const result = await s.replace(owner, store, mediaId, { uploadKey: key, fileName: 'sunrise.png' }, 'req-1')

    expect(result.ok).toBe(true)
    const saved = s.media.rows.get(mediaId)!
    expect(saved).toMatchObject({ id: mediaId, version: 2, name: 'Chapel Bridge.png', fileName: 'sunrise.png', status: 'ready', width: 40, height: 30, contentType: 'image/png' })
    expect(saved.storageKey).toMatch(new RegExp(`^${store}/${mediaId}/v2-[0-9a-f]{8}-[0-9a-f]{8}/original\\.png$`))
    expect(saved.storageKey).not.toBe(originalKey(store, mediaId, 'png'))
    // The new file and its variant are public, the old ones are still there, the raw upload is spent.
    const keys = [...s.storage.objects('media').keys()]
    expect(keys).toEqual(expect.arrayContaining([saved.storageKey, variantKey(saved.storageKey, 40), originalKey(store, mediaId, 'png'), variantKey(originalKey(store, mediaId, 'png'), 320)]))
    expect(s.storage.objects('uploads').size).toBe(0)
    expect(s.sent).toEqual([{ queue: mediaQueues.purge, data: { storeId: store, mediaId }, options: { startAfter: new Date('2026-10-31T10:00:00Z') } }])
    expect(s.audit.map(entry => entry.action)).toEqual(['replaced'])
  })

  it('[E4.11][AC51] a second replacement makes version 3 under another key', async () => {
    const s = setup()
    await s.replace(owner, store, mediaId, { uploadKey: seedRaw(s, await png('blue'), 'image/png') }, null)
    const v2 = s.media.rows.get(mediaId)!.storageKey
    await s.replace(owner, store, mediaId, { uploadKey: seedRaw(s, await png('green'), 'image/png') }, null)
    const v3 = s.media.rows.get(mediaId)!
    expect(v3.version).toBe(3)
    expect(v3.storageKey).toMatch(/\/v3-[0-9a-f]{8}-[0-9a-f]{8}\/original\.png$/)
    expect(v3.storageKey).not.toBe(v2)
    // The file name stays when the upload brings none.
    expect(v3.fileName).toBe('chapel-bridge.png')
  })

  it('[E4.11][AC51] a PDF replaces a PDF and the row keeps its kind', async () => {
    const s = setup([row({ kind: 'pdf', contentType: 'application/pdf', storageKey: originalKey(store, mediaId, 'pdf'), width: null, height: null })])
    const result = await s.replace(owner, store, mediaId, { uploadKey: seedRaw(s, pdf, 'application/pdf', 'pdf') }, null)
    expect(result).toMatchObject({ ok: true, value: { kind: 'pdf', version: 2, width: null } })
    expect(s.media.rows.get(mediaId)!.storageKey).toMatch(/\/v2-[0-9a-f]{8}-[0-9a-f]{8}\/original\.pdf$/)
    expect([...s.storage.objects('media').values()][0]).toMatchObject({ contentType: 'application/pdf', contentDisposition: 'inline' })
  })

  it('[E4.11][AC51] a photo cannot replace a PDF: refused, the row stays and the raw upload is deleted', async () => {
    const s = setup([row({ kind: 'pdf', contentType: 'application/pdf', storageKey: originalKey(store, mediaId, 'pdf'), width: null, height: null })])
    const key = seedRaw(s, await png('blue'), 'image/png')
    expect(await s.replace(owner, store, mediaId, { uploadKey: key }, null)).toEqual({ ok: false, reason: 'media-kind-mismatch' })
    expect(s.media.rows.get(mediaId)).toMatchObject({ version: 1 })
    expect(s.storage.objects('uploads').size).toBe(0)
    expect(s.storage.objects('media').size).toBe(0)
  })

  it.each([
    ['processing', 'media-not-ready'],
    ['retired', 'media-already-retired'],
  ] as const)('[E4.11][AC51] a %s file is not replaced', async (status, reason) => {
    const s = setup([row({ status })])
    expect(await s.replace(owner, store, mediaId, { uploadKey: seedRaw(s, await png('blue'), 'image/png') }, null)).toEqual({ ok: false, reason })
    expect(s.media.rows.get(mediaId)?.version).toBe(1)
  })

  it.each([
    ['a type that is not allowed', new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>'), 'image/svg+xml', 'type-not-allowed'],
    ['bytes that are not the declared type', new TextEncoder().encode('just text'), 'image/png', 'content-mismatch'],
  ] as const)('[E4.11][AC51] refuses %s with the upload reasons', async (_name, bytes, type, reason) => {
    const s = setup()
    expect(await s.replace(owner, store, mediaId, { uploadKey: seedRaw(s, bytes, type) }, null)).toEqual({ ok: false, reason })
  })

  it('[E4.11][AC51] an upload key of another store is not read', async () => {
    const s = setup()
    s.storage.seed('uploads', `${other}/${rawId}.png`, await png('blue'), { contentType: 'image/png' })
    expect(await s.replace(owner, store, mediaId, { uploadKey: `${other}/${rawId}.png` }, null)).toEqual({ ok: false, reason: 'upload-missing' })
  })

  it('[E4.11][AC51] a replacement that loses a race changes nothing and removes the files it made', async () => {
    const s = setup()
    const key = seedRaw(s, await png('blue'), 'image/png')
    // Someone else replaces the file after this request read the row and before it takes the lock.
    const realFind = s.media.findById
    let reads = 0
    s.media.findById = async (...args) => {
      const found = await realFind(...args)
      if (++reads === 2 && found)
        s.media.rows.set(found.id, { ...found, version: found.version + 1 })
      return found && reads === 2 ? { ...found, version: found.version + 1 } : found
    }
    expect(await s.replace(owner, store, mediaId, { uploadKey: key }, null)).toEqual({ ok: false, reason: 'stale' })
    expect([...s.storage.objects('media').keys()]).toEqual([])
    expect(s.sent).toEqual([])
  })

  it('[E4.11][AC51] two replacements with the same bytes from the same version: the loser leaves the winner\'s live objects alone', async () => {
    const s = setup()
    const bytes = await png('blue')
    const winnerUpload = `${store}/${rawId}.png`
    const loserUpload = `${store}/${otherRawId}.png`
    s.storage.seed('uploads', winnerUpload, bytes, { contentType: 'image/png' })
    s.storage.seed('uploads', loserUpload, bytes, { contentType: 'image/png' })
    // The loser has read version 1 and built its objects. The winner commits before the loser takes the row lock.
    const realFind = s.media.findById
    let reads = 0
    let winner: Awaited<ReturnType<Setup['replace']>> | undefined
    s.media.findById = async (...args) => {
      if (++reads === 2)
        winner = await s.replace(owner, store, mediaId, { uploadKey: winnerUpload }, 'winner')

      return realFind(...args)
    }

    const loser = await s.replace(owner, store, mediaId, { uploadKey: loserUpload }, 'loser')

    expect(loser).toEqual({ ok: false, reason: 'stale' })
    expect(winner).toMatchObject({ ok: true, value: { version: 2 } })
    const live = s.media.rows.get(mediaId)!.storageKey
    const keys = [...s.storage.objects('media').keys()]
    expect(keys).toContain(live)
    expect(keys).toContain(variantKey(live, 40))
    expect(keys.every(key => isCurrentObject(live, key))).toBe(true)
  })

  it('[E4.11][AC51] a guest and staff of another store are forbidden', async () => {
    const s = setup()
    expect(await s.replace(guest, store, mediaId, { uploadKey: 'x' }, null)).toEqual({ ok: false, reason: 'forbidden' })
    expect(await s.replace(elsewhere, store, mediaId, { uploadKey: 'x' }, null)).toEqual({ ok: false, reason: 'forbidden' })
  })
})

describe('[E4.11][AC51] purging old versions', () => {
  it('[E4.11][AC51] removes the objects beside every key but the current one, and keeps what is fresh', async () => {
    const current = versionedKey(store, mediaId, 3, 'c'.repeat(64), 'png', 'n0n0n0n0')
    const s = setup([row({ storageKey: current, version: 3 })])
    const old = new Date('2026-10-29T10:00:00Z')
    const first = originalKey(store, mediaId, 'png')
    const v2 = versionedKey(store, mediaId, 2, 'b'.repeat(64), 'png', 'n0n0n0n0')
    for (const key of [first, variantKey(first, 320), v2, variantKey(v2, 320)])
      s.storage.seed('media', key, new Uint8Array([1]), { lastModified: old })
    s.storage.seed('media', current, new Uint8Array([1]), { lastModified: old })
    s.storage.seed('media', variantKey(current, 320), new Uint8Array([1]), { lastModified: old })
    // A replacement that is being made right now.
    const v4 = versionedKey(store, mediaId, 4, 'd'.repeat(64), 'png', 'n0n0n0n0')
    s.storage.seed('media', v4, new Uint8Array([1]), { lastModified: s.clock.now() })

    await s.purge({ storeId: store, mediaId })

    expect([...s.storage.objects('media').keys()].sort()).toEqual([current, variantKey(current, 320), v4].sort())
    expect([...s.storage.objects('media').keys()].every(key => isCurrentObject(current, key) || key === v4)).toBe(true)
  })

  it('[E4.11][AC51] leaves a retired or missing row to the retire job', async () => {
    const s = setup([row({ status: 'retired' })])
    s.storage.seed('media', originalKey(store, mediaId, 'png'), new Uint8Array([1]), { lastModified: new Date('2026-10-01T00:00:00Z') })
    await s.purge({ storeId: store, mediaId })
    await s.purge({ storeId: store, mediaId: rawId })
    expect(s.storage.objects('media').size).toBe(1)
  })
})
