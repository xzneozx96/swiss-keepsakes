import type { Actor } from '@sk/domain/identity'
import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { guardUseCases, mapDatabaseError } from '../../src/modules/content/adapters/database-errors.ts'
import { createMediaRepository } from '../../src/modules/content/adapters/media-repository.ts'
import { createPinRepository } from '../../src/modules/content/adapters/pin-repository.ts'
import { makeCreatePin } from '../../src/modules/content/application/create-pin.ts'
import { makeDeletePin } from '../../src/modules/content/application/delete-pin.ts'
import { makeHidePin } from '../../src/modules/content/application/hide-pin.ts'
import { makePublishPin } from '../../src/modules/content/application/publish-pin.ts'
import { makeSavePin } from '../../src/modules/content/application/save-pin.ts'
import { createAuditLog } from '../../src/platform/audit.ts'
import { createUnitOfWork } from '../../src/platform/db/unit-of-work.ts'
import { createManualClock } from '../support/manual-clock.ts'
import { count, openTestDatabase } from './support.ts'

vi.setConfig({ testTimeout: 60_000, hookTimeout: 120_000 })

const { pool, db } = openTestDatabase()

afterAll(async () => {
  await pool.end()
})

function setup() {
  const store = randomUUID()
  const actor: Actor = { kind: 'staff', userId: randomUUID(), guestId: randomUUID(), stores: new Map([[store, 'owner']]) }
  const clock = createManualClock(new Date('2026-10-27T10:00:00Z'))
  const uow = createUnitOfWork(db)
  const pins = createPinRepository()
  const deps = { uow, pins, media: createMediaRepository(), audit: createAuditLog(clock), clock }
  const use = guardUseCases({
    create: makeCreatePin(deps),
    save: makeSavePin(deps),
    publish: makePublishPin(deps),
    hide: makeHidePin(deps),
    remove: makeDeletePin(deps),
  })
  return { store, actor, use, uow, pins, clock }
}

function slug() {
  return `pin-${randomUUID().slice(0, 8)}`
}

async function media(store: string, kind: 'image' | 'pdf', status: 'ready' | 'retired' = 'ready'): Promise<string> {
  const contentType = kind === 'pdf' ? 'application/pdf' : 'image/jpeg'
  const { rows } = await pool.query<{ id: string }>(
    `insert into content.media (store_id, kind, storage_key, content_type, byte_size, sha256, status)
     values ($1, $2, $3, $4, 10, repeat('a', 64), 'ready') returning id`,
    [store, kind, `${store}/${randomUUID()}`, contentType],
  )
  const id = rows[0]!.id
  if (status === 'retired')
    await pool.query(`update content.media set status = 'retired', retired_at = now() where id = $1`, [id])
  return id
}

async function mapCategory(store: string): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `insert into content.map_categories (store_id, name, slug) values ($1, '{"en":"Food"}', $2) returning id`,
    [store, slug()],
  )
  return rows[0]!.id
}

async function pinRow(id: string) {
  const { rows } = await pool.query<{ status: string, row_version: number, first_published_at: Date | null, slug: Record<string, string> | null, published: { name: Record<string, string> } | null }>(
    'select status, row_version, first_published_at, slug, published from content.places where id = $1',
    [id],
  )
  return rows[0]
}

type Setup = ReturnType<typeof setup>

async function draft(s: Setup, extra: Record<string, unknown> = {}) {
  const result = await s.use.create(s.actor, s.store, { title: { en: 'Chapel Bridge' }, slug: { en: slug() }, latitude: 47.05, longitude: 8.3, ...extra }, null)
  if (!result.ok)
    throw new Error(`create failed: ${result.reason}`)
  return result.value
}

async function thrown(work: () => Promise<unknown>): Promise<unknown> {
  try {
    await work()
  }
  catch (error) {
    return error
  }
  throw new Error('expected a failure')
}

describe('[E2.6] pin repository on the real database', () => {
  it('[E2.6][AC85] a pin publishes against the real guards with no story and no category', async () => {
    const s = setup()
    const pin = await draft(s)
    const result = await s.use.publish(s.actor, s.store, pin.id, 1, randomUUID())
    expect(result).toMatchObject({ ok: true, value: { status: 'published', rowVersion: 2, draft: null, published: { title: { en: 'Chapel Bridge' }, tip: {} }, mainStoryGroupId: null, categoryIds: [] } })
    expect(result.ok && result.value.firstPublishedAt).toBeInstanceOf(Date)
    expect(await count(pool, `select count(*) from platform.audit_log where entity = 'pin' and entity_id = $1 and action = 'published'`, [pin.id])).toBe(1)
  })

  it('[E2.6][AC30] a live English pin gains German: the slug column and the published text change in one publish', async () => {
    const s = setup()
    const en = slug()
    const de = slug()
    const pin = await draft(s, { slug: { en } })
    await s.use.publish(s.actor, s.store, pin.id, 1, null)
    await s.use.save(s.actor, s.store, pin.id, 2, { title: { en: 'Chapel Bridge', de: 'Kapellbruecke' }, tip: { en: 'Go early', de: 'Frueh hingehen' } }, null)
    const result = await s.use.publish(s.actor, s.store, pin.id, 3, randomUUID(), { de })
    expect(result).toMatchObject({ ok: true, value: { status: 'published', slug: { en, de }, published: { title: { en: 'Chapel Bridge', de: 'Kapellbruecke' }, tip: { en: 'Go early', de: 'Frueh hingehen' } }, draft: null } })
    expect(await pinRow(pin.id)).toMatchObject({ status: 'published', row_version: 4, slug: { en, de }, published: { name: { en: 'Chapel Bridge', de: 'Kapellbruecke' } } })
  })

  it('[E2.6][AC30] a live English and German pin drops German: the slug goes with it, English stays live, no check error', async () => {
    const s = setup()
    const en = slug()
    const pin = await draft(s, { title: { en: 'Chapel Bridge', de: 'Kapellbruecke' }, slug: { en, de: slug() } })
    await s.use.publish(s.actor, s.store, pin.id, 1, null)
    await s.use.save(s.actor, s.store, pin.id, 2, { title: { en: 'Chapel Bridge' } }, null)
    const result = await s.use.publish(s.actor, s.store, pin.id, 3, null)
    expect(result).toMatchObject({ ok: true, value: { status: 'published', slug: { en }, published: { title: { en: 'Chapel Bridge' } } } })
    expect(await pinRow(pin.id)).toMatchObject({ status: 'published', row_version: 4, slug: { en }, published: { name: { en: 'Chapel Bridge' } } })
  })

  it('[E2.6][AC30] a draft pin with a stored slug publishes with the body slug as its live slug', async () => {
    const s = setup()
    const stored = slug()
    const chosen = slug()
    const pin = await draft(s, { slug: { en: stored } })
    const result = await s.use.publish(s.actor, s.store, pin.id, 1, null, { en: chosen })
    expect(result).toMatchObject({ ok: true, value: { status: 'published', slug: { en: chosen } } })
    expect(await pinRow(pin.id)).toMatchObject({ status: 'published', slug: { en: chosen } })
  })

  it('[E2.6][AC68] a live pin refuses a body slug that renames it as slug-conflict and the row and its version are unchanged', async () => {
    const s = setup()
    const pin = await draft(s)
    await s.use.publish(s.actor, s.store, pin.id, 1, null)
    const before = await pinRow(pin.id)
    expect(await s.use.publish(s.actor, s.store, pin.id, 2, null, { en: slug() })).toEqual({ ok: false, reason: 'slug-conflict' })
    expect(await pinRow(pin.id)).toEqual(before)
    expect(before).toMatchObject({ status: 'published', row_version: 2 })
  })

  it('[E2.6][AC68] removing the last complete language is refused naming title and the pin is unchanged', async () => {
    const s = setup()
    const en = slug()
    const pin = await draft(s, { slug: { en } })
    await s.use.publish(s.actor, s.store, pin.id, 1, null)
    await s.use.save(s.actor, s.store, pin.id, 2, { title: {} }, null)
    const before = await pinRow(pin.id)
    const result = await s.use.publish(s.actor, s.store, pin.id, 3, null)
    expect(result).toMatchObject({ ok: false, reason: 'incomplete', gaps: expect.arrayContaining(['title']) })
    expect(await pinRow(pin.id)).toEqual(before)
    expect(before).toMatchObject({ row_version: 3, slug: { en }, published: { name: { en: 'Chapel Bridge' } } })
  })

  it('[E2.6][AC68] adding German with a slug another pin owns is slug-taken and the pin is unchanged', async () => {
    const s = setup()
    const taken = slug()
    await draft(s, { slug: { en: slug(), de: taken }, title: { en: 'Lion Monument', de: 'Loewendenkmal' } })
    const pin = await draft(s)
    await s.use.publish(s.actor, s.store, pin.id, 1, null)
    await s.use.save(s.actor, s.store, pin.id, 2, { title: { en: 'Chapel Bridge', de: 'Kapellbruecke' } }, null)
    const before = await pinRow(pin.id)
    expect(await s.use.publish(s.actor, s.store, pin.id, 3, null, { de: taken })).toEqual({ ok: false, reason: 'slug-taken' })
    expect(await pinRow(pin.id)).toEqual(before)
    expect(before).toMatchObject({ status: 'published', row_version: 3 })
  })

  it('[E2.6][AC68] adding German with no slug for it is incomplete naming slug', async () => {
    const s = setup()
    const pin = await draft(s)
    await s.use.publish(s.actor, s.store, pin.id, 1, null)
    await s.use.save(s.actor, s.store, pin.id, 2, { title: { en: 'Chapel Bridge', de: 'Kapellbruecke' } }, null)
    expect(await s.use.publish(s.actor, s.store, pin.id, 3, null)).toEqual({ ok: false, reason: 'incomplete', gaps: ['slug'] })
    expect(await pinRow(pin.id)).toMatchObject({ status: 'published', row_version: 3 })
  })

  it('[E2.6][AC68] publish without a slug is incomplete and the row stays draft', async () => {
    const s = setup()
    const pin = await draft(s, { slug: null })
    expect(await s.use.publish(s.actor, s.store, pin.id, 1, null)).toEqual({ ok: false, reason: 'incomplete', gaps: ['slug'] })
    expect(await pinRow(pin.id)).toMatchObject({ status: 'draft', row_version: 1 })
  })

  it('[E2.6] AC-1 two saves racing with the same If-Match: one 200, one stale, row_version +1', async () => {
    const s = setup()
    const pin = await draft(s)
    const results = await Promise.all([
      s.use.save(s.actor, s.store, pin.id, 1, { address: 'Kapellgasse 1' }, null),
      s.use.save(s.actor, s.store, pin.id, 1, { address: 'Kapellgasse 2' }, null),
    ])
    expect(results.filter(r => r.ok)).toHaveLength(1)
    expect(results.filter(r => !r.ok)).toEqual([{ ok: false, reason: 'stale' }])
    expect((await pinRow(pin.id))?.row_version).toBe(2)
  })

  it('[E2.6] a slug used by another pin is slug-taken, not a thrown error', async () => {
    const s = setup()
    const taken = slug()
    await draft(s, { slug: { en: taken } })
    expect(await s.use.create(s.actor, s.store, { slug: { en: taken } }, null)).toEqual({ ok: false, reason: 'slug-taken' })
    const other = await draft(s)
    expect(await s.use.save(s.actor, s.store, other.id, 1, { slug: { en: taken } }, null)).toEqual({ ok: false, reason: 'slug-taken' })
    expect((await pinRow(other.id))?.row_version).toBe(1)
  })

  it('[E2.6][AC79] the database refuses a direct delete of a published pin and mapDatabaseError says published-cannot-be-deleted', async () => {
    const s = setup()
    const pin = await draft(s)
    await s.use.publish(s.actor, s.store, pin.id, 1, null)
    const error = await thrown(() => s.uow.run(tx => s.pins.remove(tx, s.store, pin.id)))
    expect(error).toMatchObject({ cause: { code: '23001' } })
    expect(mapDatabaseError(error)).toEqual({ reason: 'published-cannot-be-deleted' })
    expect((await pinRow(pin.id))?.status).toBe('published')
  })

  it('[E2.6][AC79] a draft pin that a story group or a tour stop names is in-use, not a thrown error', async () => {
    const s = setup()
    const mentioned = await draft(s)
    const group = (await pool.query<{ id: string }>(`insert into content.story_groups (store_id, kind) values ($1, 'story') returning id`, [s.store])).rows[0]!.id
    await pool.query('insert into content.story_group_places (group_id, place_id, store_id, position) values ($1, $2, $3, 1)', [group, mentioned.id, s.store])
    const error = await thrown(() => s.uow.run(tx => s.pins.remove(tx, s.store, mentioned.id)))
    // ON DELETE RESTRICT raises restrict_violation (23001), not 23503, with the "update or delete on table" wording.
    expect(error).toMatchObject({ cause: { code: '23001', message: expect.stringContaining('update or delete on table') } })
    expect(mapDatabaseError(error)).toEqual({ reason: 'in-use' })
    expect(await s.use.remove(s.actor, s.store, mentioned.id, 1, null)).toEqual({ ok: false, reason: 'in-use' })

    const stopped = await draft(s)
    const tour = (await pool.query<{ id: string }>('insert into content.tours (store_id) values ($1) returning id', [s.store])).rows[0]!.id
    await pool.query(`insert into content.tour_stops (tour_id, store_id, position, latitude, longitude, content, place_id) values ($1, $2, 1, 47, 8, '{}', $3)`, [tour, s.store, stopped.id])
    expect(await s.use.remove(s.actor, s.store, stopped.id, 1, null)).toEqual({ ok: false, reason: 'in-use' })
    expect(await pinRow(stopped.id)).toBeDefined()
  })

  it('[E2.6][AC79] a delete with a stale If-Match leaves the row, and the current one deletes it', async () => {
    const s = setup()
    const pin = await draft(s)
    expect(await s.use.remove(s.actor, s.store, pin.id, 2, null)).toEqual({ ok: false, reason: 'stale' })
    expect(await pinRow(pin.id)).toBeDefined()
    expect(await s.use.remove(s.actor, s.store, pin.id, pin.rowVersion, null)).toEqual({ ok: true, value: { id: pin.id } })
    expect(await pinRow(pin.id)).toBeUndefined()
  })

  it('[E2.6][AC79] hide leaves the row, the audit row exists, first_published_at is unchanged', async () => {
    const s = setup()
    const pin = await draft(s)
    await s.use.publish(s.actor, s.store, pin.id, 1, null)
    const before = await pinRow(pin.id)
    s.clock.advance(60_000)
    const result = await s.use.hide(s.actor, s.store, pin.id, 2, randomUUID())
    expect(result).toMatchObject({ ok: true, value: { status: 'hidden', rowVersion: 3 } })
    expect((await pinRow(pin.id))?.first_published_at).toEqual(before?.first_published_at)
    expect(await count(pool, `select count(*) from platform.audit_log where entity_id = $1 and action = 'hidden'`, [pin.id])).toBe(1)
    const again = await s.use.publish(s.actor, s.store, pin.id, 3, null)
    expect(again).toMatchObject({ ok: true, value: { status: 'published', published: { title: { en: 'Chapel Bridge' } } } })
  })

  it('[E2.6] a category id of another store is reference-invalid', async () => {
    const s = setup()
    const foreign = await mapCategory(randomUUID())
    expect(await s.use.create(s.actor, s.store, { categoryIds: [foreign] }, null)).toEqual({ ok: false, reason: 'reference-invalid' })
    const pin = await draft(s)
    expect(await s.use.save(s.actor, s.store, pin.id, 1, { categoryIds: [foreign] }, null)).toEqual({ ok: false, reason: 'reference-invalid' })
    expect(await s.use.save(s.actor, s.store, pin.id, 1, { mainStoryGroupId: randomUUID() }, null)).toEqual({ ok: false, reason: 'reference-invalid' })
    expect(await count(pool, 'select count(*) from content.place_categories where place_id = $1', [pin.id])).toBe(0)
  })

  it('[E2.6] saving dates replaces the entries and deleting a draft pin removes its dates and categories', async () => {
    const s = setup()
    const category = await mapCategory(s.store)
    const pin = await draft(s, { categoryIds: [category], dates: [{ firstDay: '2026-11-20', lastDay: '2026-11-21' }] })
    expect(pin.categoryIds).toEqual([category])
    const saved = await s.use.save(s.actor, s.store, pin.id, 1, { dates: [{ firstDay: '2026-12-01', lastDay: '2026-12-01', startTime: '10:00', endTime: '12:30' }] }, null)
    expect(saved).toMatchObject({ ok: true, value: { categoryIds: [category], dates: [{ firstDay: '2026-12-01', lastDay: '2026-12-01', startTime: '10:00', endTime: '12:30' }] } })
    const cleared = await s.use.save(s.actor, s.store, pin.id, 2, { categoryIds: [] }, null)
    expect(cleared).toMatchObject({ ok: true, value: { categoryIds: [], dates: [{ firstDay: '2026-12-01' }] } })
    expect(await s.use.remove(s.actor, s.store, pin.id, 3, null)).toEqual({ ok: true, value: { id: pin.id } })
    expect(await count(pool, 'select count(*) from content.place_dates where place_id = $1', [pin.id])).toBe(0)
  })

  it('[E2.6] a cover that is a PDF is media-invalid and a retired image is media-retired', async () => {
    const s = setup()
    const pdf = await media(s.store, 'pdf')
    const retired = await media(s.store, 'image', 'retired')
    const image = await media(s.store, 'image')
    const pin = await draft(s)
    expect(await s.use.save(s.actor, s.store, pin.id, 1, { coverMediaId: pdf }, null)).toEqual({ ok: false, reason: 'media-invalid' })
    expect(await s.use.save(s.actor, s.store, pin.id, 1, { coverMediaId: retired }, null)).toEqual({ ok: false, reason: 'media-retired' })
    expect(await s.use.save(s.actor, s.store, pin.id, 1, { coverMediaId: image }, null)).toMatchObject({ ok: true, value: { coverMediaId: image } })
  })

  it('[E2.6] a row of another store is not-found for every write', async () => {
    const s = setup()
    const pin = await draft(s)
    const other = setup()
    expect(await other.use.save(other.actor, other.store, pin.id, 1, { address: 'x' }, null)).toEqual({ ok: false, reason: 'not-found' })
    expect(await other.use.remove(other.actor, other.store, pin.id, 1, null)).toEqual({ ok: false, reason: 'not-found' })
  })
})
