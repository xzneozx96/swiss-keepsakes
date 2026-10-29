import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { createMediaRepository } from '../../src/modules/content/adapters/media-repository.ts'
import { makeRetireMedia } from '../../src/modules/content/application/retire-media.ts'
import { createUnitOfWork } from '../../src/platform/db/unit-of-work.ts'
import { openTestDatabase } from './support.ts'

vi.setConfig({ testTimeout: 60_000, hookTimeout: 120_000 })

const { pool, db } = openTestDatabase()
const uow = createUnitOfWork(db)
const media = createMediaRepository()
const at = new Date('2026-10-28T10:00:00Z')
const later = new Date('2026-10-28T11:00:00Z')

afterAll(async () => {
  await pool.end()
})

const sha = 'b'.repeat(64)

function newRow(store: string, kind: 'image' | 'audio' | 'pdf' = 'image', byteSize = 1234) {
  const id = randomUUID()
  const ext = kind === 'image' ? 'jpg' : kind === 'pdf' ? 'pdf' : 'mp3'
  const contentType = kind === 'image' ? 'image/jpeg' : kind === 'pdf' ? 'application/pdf' : 'audio/mpeg'
  return { id, storeId: store, kind, storageKey: `${store}/${id}/original.${ext}`, contentType, byteSize, sha256: sha }
}

async function failure(work: Promise<unknown>): Promise<{ code?: string, constraint?: string } | undefined> {
  try {
    await work
  }
  catch (error) {
    // Drizzle wraps the driver error and keeps it as the cause.
    return ((error as { cause?: object }).cause ?? error) as { code?: string, constraint?: string }
  }
}

async function rowOf(id: string) {
  const { rows } = await pool.query<{ status: string, retired_at: Date | null, width: number | null, height: number | null }>('select status, retired_at, width, height from content.media where id = $1', [id])
  return rows[0]
}

describe('[E2.7] the media repository', () => {
  it('[E2.7] insert writes a processing row without dimensions and reads back as a record', async () => {
    const store = randomUUID()
    const row = newRow(store, 'image', 5_000_000_000)

    const inserted = await uow.run(tx => media.insert(tx, row, at))

    expect(inserted).toEqual({ ...row, width: null, height: null, status: 'processing' })
    expect(await uow.run(tx => media.findById(tx, store, row.id))).toEqual(inserted)
  })

  it('[E2.7] findById of another store, or of a missing id, is undefined', async () => {
    const store = randomUUID()
    const row = newRow(store)
    await uow.run(tx => media.insert(tx, row, at))

    expect(await uow.run(tx => media.findById(tx, randomUUID(), row.id))).toBeUndefined()
    expect(await uow.run(tx => media.findById(tx, store, randomUUID()))).toBeUndefined()
  })

  it('[E2.7] findById with forUpdate returns the row', async () => {
    const store = randomUUID()
    const row = newRow(store)
    await uow.run(tx => media.insert(tx, row, at))

    expect(await uow.run(tx => media.findById(tx, store, row.id, { forUpdate: true }))).toMatchObject({ id: row.id, status: 'processing' })
  })

  it('[E2.7] two inserts of one storage key: the second is refused by the unique key', async () => {
    const store = randomUUID()
    const row = newRow(store)
    await uow.run(tx => media.insert(tx, row, at))

    expect(await failure(uow.run(tx => media.insert(tx, { ...row, id: randomUUID() }, at)))).toMatchObject({ code: '23505', constraint: 'media_storage_key_key' })
  })

  it('[E2.7] markReady with dimensions sets status and size of an image', async () => {
    const store = randomUUID()
    const row = newRow(store)
    const inserted = await uow.run(tx => media.insert(tx, row, at))

    const ready = await uow.run(tx => media.markReady(tx, inserted, { width: 1500, height: 1000 }, later))

    expect(ready).toMatchObject({ status: 'ready', width: 1500, height: 1000 })
    expect(await rowOf(row.id)).toMatchObject({ status: 'ready', width: 1500, height: 1000, retired_at: null })
  })

  it('[E2.7] markReady without dimensions is fine for a PDF and an audio file', async () => {
    const store = randomUUID()
    for (const kind of ['pdf', 'audio'] as const) {
      const inserted = await uow.run(tx => media.insert(tx, newRow(store, kind), at))

      expect(await uow.run(tx => media.markReady(tx, inserted, undefined, later))).toMatchObject({ status: 'ready', width: null, height: null })
    }
  })

  it('[E2.7] markReady with a width on a PDF is refused by media_dimensions_check', async () => {
    const store = randomUUID()
    const inserted = await uow.run(tx => media.insert(tx, newRow(store, 'pdf'), at))

    expect(await failure(uow.run(tx => media.markReady(tx, inserted, { width: 10, height: 10 }, later)))).toMatchObject({ code: '23514', constraint: 'media_dimensions_check' })
    expect(await rowOf(inserted.id)).toMatchObject({ status: 'processing', width: null })
  })

  it('[E2.7] retire sets status retired and retired_at together', async () => {
    const store = randomUUID()
    const inserted = await uow.run(tx => media.insert(tx, newRow(store), at))

    const retired = await uow.run(tx => media.retire(tx, inserted, later))

    expect(retired?.status).toBe('retired')
    expect(await rowOf(inserted.id)).toMatchObject({ status: 'retired', retired_at: later })
  })

  it('[E2.7] retire and markReady with the store of another tenant change nothing and answer undefined', async () => {
    const store = randomUUID()
    const inserted = await uow.run(tx => media.insert(tx, newRow(store), at))
    const foreign = { ...inserted, storeId: randomUUID() }

    expect(await uow.run(tx => media.retire(tx, foreign, later))).toBeUndefined()
    expect(await uow.run(tx => media.markReady(tx, foreign, { width: 10, height: 10 }, later))).toBeUndefined()
    expect(await rowOf(inserted.id)).toMatchObject({ status: 'processing', retired_at: null, width: null })
  })

  it('[E2.7] retire and markReady on a row that does not exist answer undefined', async () => {
    const store = randomUUID()
    const inserted = await uow.run(tx => media.insert(tx, newRow(store), at))
    const gone = { ...inserted, id: randomUUID() }

    expect(await uow.run(tx => media.retire(tx, gone, later))).toBeUndefined()
    expect(await uow.run(tx => media.markReady(tx, gone, undefined, later))).toBeUndefined()
  })
})

describe('[E2.7] isReferenced', () => {
  const referenced = (store: string, id: string) => uow.run(tx => media.isReferenced(tx, store, id))

  async function readyMedia(store: string, kind: 'image' | 'pdf' = 'image') {
    const row = newRow(store, kind)
    const inserted = await uow.run(tx => media.insert(tx, row, at))
    await uow.run(tx => media.markReady(tx, inserted, kind === 'image' ? { width: 10, height: 10 } : undefined, at))
    return row.id
  }

  async function newTour(store: string, columns: Record<string, string> = {}) {
    const names = Object.keys(columns)
    const { rows } = await pool.query<{ id: string }>(
      `insert into content.tours (store_id${names.map(n => `, ${n}`).join('')}) values ($1${names.map((_, i) => `, $${i + 2}`).join('')}) returning id`,
      [store, ...Object.values(columns)],
    )
    return rows[0]!.id
  }

  it('[E2.7] an unreferenced row is not referenced', async () => {
    const store = randomUUID()

    expect(await referenced(store, await readyMedia(store))).toBe(false)
  })

  it('[E2.7] a tour PDF counts', async () => {
    const store = randomUUID()
    const id = await readyMedia(store, 'pdf')
    await newTour(store, { pdf_media_id: id })

    expect(await referenced(store, id)).toBe(true)
  })

  it('[E2.7] a tour cover counts', async () => {
    const store = randomUUID()
    const id = await readyMedia(store)
    await newTour(store, { cover_media_id: id })

    expect(await referenced(store, id)).toBe(true)
  })

  it('[E2.7] a tour stop photo counts', async () => {
    const store = randomUUID()
    const id = await readyMedia(store)
    const tour = await newTour(store)
    await pool.query(`insert into content.tour_stops (tour_id, store_id, position, latitude, longitude, content, media_id) values ($1, $2, 1, 47.05, 8.3, '{}', $3)`, [tour, store, id])

    expect(await referenced(store, id)).toBe(true)
  })

  it('[E2.7] a place cover counts', async () => {
    const store = randomUUID()
    const id = await readyMedia(store)
    await pool.query('insert into content.places (store_id, cover_media_id) values ($1, $2)', [store, id])

    expect(await referenced(store, id)).toBe(true)
  })

  it('[E4.2][AC68] a place extra photo counts, and a retire job leaves the file alone', async () => {
    const store = randomUUID()
    const id = await readyMedia(store)
    const pin = (await pool.query<{ id: string }>('insert into content.places (store_id) values ($1) returning id', [store])).rows[0]!.id
    await pool.query('insert into content.place_photos (place_id, store_id, position, media_id) values ($1, $2, 1, $3)', [pin, store, id])
    const deleted: string[] = []
    const storage = { list: async () => [{ key: 'k' }], delete: async (_bucket: string, key: string) => void deleted.push(key) }
    const retire = makeRetireMedia({ uow, media, storage: storage as never, clock: { now: () => later } })

    expect(await referenced(store, id)).toBe(true)
    await retire({ storeId: store, mediaId: id })

    expect((await rowOf(id))?.status).toBe('ready')
    expect(deleted).toEqual([])
  })

  it('[E2.7] a story_version media_refs row counts, in the draft and the published slot', async () => {
    for (const slot of ['draft', 'published']) {
      const store = randomUUID()
      const id = await readyMedia(store)
      await pool.query(`insert into content.media_refs (store_id, media_id, owner_kind, owner_id, owner_language, slot) values ($1, $2, 'story_version', $3, 'en', $4)`, [store, id, randomUUID(), slot])

      expect(await referenced(store, id), slot).toBe(true)
    }
  })

  it('[E2.7] a media_refs row counts, in either slot', async () => {
    const store = randomUUID()
    const id = await readyMedia(store)
    await pool.query(`insert into content.media_refs (store_id, media_id, owner_kind, owner_id, slot) values ($1, $2, 'tour', $3, 'draft')`, [store, id, randomUUID()])

    expect(await referenced(store, id)).toBe(true)
  })

  it('[E2.7] a reference in another store does not count for this store', async () => {
    const store = randomUUID()
    const id = await readyMedia(store)

    expect(await referenced(randomUUID(), id)).toBe(false)
  })
})
