import type { TourGuideDoc } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { TourChanges } from '../../src/modules/content/ports.ts'
import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { guardUseCases, mapDatabaseError } from '../../src/modules/content/adapters/database-errors.ts'
import { createMediaRepository } from '../../src/modules/content/adapters/media-repository.ts'
import { createPinRepository } from '../../src/modules/content/adapters/pin-repository.ts'
import { createTourRepository } from '../../src/modules/content/adapters/tour-repository.ts'
import { makeCreateTour } from '../../src/modules/content/application/create-tour.ts'
import { makeDeleteTour } from '../../src/modules/content/application/delete-tour.ts'
import { makePublishTour } from '../../src/modules/content/application/publish-tour.ts'
import { makeSaveTour } from '../../src/modules/content/application/save-tour.ts'
import { makeUnpublishTour } from '../../src/modules/content/application/unpublish-tour.ts'
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
  const tours = createTourRepository()
  const deps = { uow, tours, media: createMediaRepository(), audit: createAuditLog(clock), clock }
  const use = guardUseCases({
    create: makeCreateTour(deps),
    save: makeSaveTour(deps),
    publish: makePublishTour(deps),
    unpublish: makeUnpublishTour(deps),
    remove: makeDeleteTour(deps),
  })
  return { store, actor, use, uow, tours }
}

type Setup = ReturnType<typeof setup>

const slug = () => `tour-${randomUUID().slice(0, 8)}`
const doc = (en: string): TourGuideDoc => ({ title: { en }, summary: {}, meetingPoint: {}, sections: [] })

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

async function tourRow(id: string) {
  const { rows } = await pool.query<{ status: string, row_version: number, pdf_media_id: string | null }>(
    'select status, row_version, pdf_media_id from content.tours where id = $1',
    [id],
  )
  return rows[0]
}

async function draft(s: Setup, extra: TourChanges = {}) {
  const pdf = await media(s.store, 'pdf')
  const result = await s.use.create(s.actor, s.store, { slug: { en: slug() }, pdfMediaId: pdf, draft: doc('Old town walk'), ...extra }, null)
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

function stop(n: number, extra: Partial<NonNullable<TourChanges['stops']>[number]> = {}) {
  return { latitude: 47 + n / 100, longitude: 8 + n / 100, title: { en: `Stop ${n}` }, text: {}, minutesFromStart: n * 10, mediaId: null, placeId: null, ...extra }
}

describe('[E2.6] tour guide repository on the real database', () => {
  it('[E2.6] a tour publishes against the real guard with slug, title and PDF', async () => {
    const s = setup()
    const tour = await draft(s, { keepsakeProductIds: [randomUUID(), randomUUID()] })
    const result = await s.use.publish(s.actor, s.store, tour.id, 1, randomUUID())
    expect(result).toMatchObject({ ok: true, value: { status: 'published', rowVersion: 2, draft: null, published: { title: { en: 'Old town walk' } } } })
    expect(result.ok && result.value.keepsakeProductIds).toEqual(tour.keepsakeProductIds)
    expect(await count(pool, `select count(*) from platform.audit_log where entity = 'tour' and entity_id = $1 and action = 'published'`, [tour.id])).toBe(1)
    const unpublished = await s.use.unpublish(s.actor, s.store, tour.id, 2, randomUUID())
    expect(unpublished).toMatchObject({ ok: true, value: { status: 'draft', rowVersion: 3, published: { title: { en: 'Old town walk' } } } })
    expect(await count(pool, `select count(*) from platform.audit_log where entity = 'tour' and entity_id = $1 and action = 'unpublished'`, [tour.id])).toBe(1)
  })

  it('[E2.6] slug and title languages that differ are incomplete before the database sees them', async () => {
    const s = setup()
    const tour = await draft(s, { draft: { ...doc('A'), title: { en: 'A', de: 'B' } } })
    expect(await s.use.publish(s.actor, s.store, tour.id, 1, null)).toEqual({ ok: false, reason: 'incomplete', gaps: ['slug'] })
    expect(await tourRow(tour.id)).toMatchObject({ status: 'draft', row_version: 1 })
    const noPdf = await s.use.create(s.actor, s.store, { slug: { en: slug() }, draft: doc('A') }, null)
    expect(noPdf.ok && await s.use.publish(s.actor, s.store, noPdf.value.id, 1, null)).toEqual({ ok: false, reason: 'incomplete', gaps: ['pdf'] })
  })

  it('[E2.6] the same slug on two tours is slug-taken', async () => {
    const s = setup()
    const taken = slug()
    await draft(s, { slug: { en: taken } })
    expect(await s.use.create(s.actor, s.store, { slug: { en: taken } }, null)).toEqual({ ok: false, reason: 'slug-taken' })
    const other = await draft(s)
    expect(await s.use.save(s.actor, s.store, other.id, 1, { slug: { en: taken } }, null)).toEqual({ ok: false, reason: 'slug-taken' })
    expect((await tourRow(other.id))?.row_version).toBe(1)
  })

  it('[E2.6] stops are replaced and keep position order, and a stop place of another store is reference-invalid', async () => {
    const s = setup()
    const tour = await draft(s)
    const photo = await media(s.store, 'image')
    const first = await s.use.save(s.actor, s.store, tour.id, 1, { stops: [stop(3, { mediaId: photo }), stop(1), stop(2)] }, null)
    expect(first.ok && first.value.stops.map(x => [x.position, x.latitude, x.title.en, x.mediaId])).toEqual([[1, 47.03, 'Stop 3', photo], [2, 47.01, 'Stop 1', null], [3, 47.02, 'Stop 2', null]])
    const second = await s.use.save(s.actor, s.store, tour.id, 2, { stops: [stop(2), stop(3)] }, null)
    expect(second.ok && second.value.stops.map(x => [x.position, x.title.en])).toEqual([[1, 'Stop 2'], [2, 'Stop 3']])
    expect(await count(pool, 'select count(*) from content.tour_stops where tour_id = $1', [tour.id])).toBe(2)
    // A list left out is unchanged.
    const third = await s.use.save(s.actor, s.store, tour.id, 3, { stayTag: 'multi_day' }, null)
    expect(third).toMatchObject({ ok: true, value: { stayTag: 'multi_day', rowVersion: 4, stops: [{ position: 1 }, { position: 2 }] } })

    const otherStore = randomUUID()
    const place = await uowInsertPlace(otherStore)
    expect(await s.use.save(s.actor, s.store, tour.id, 4, { stops: [stop(1, { placeId: place })] }, null)).toEqual({ ok: false, reason: 'reference-invalid' })
    expect(await count(pool, 'select count(*) from content.tour_stops where tour_id = $1', [tour.id])).toBe(2)
    expect((await tourRow(tour.id))?.row_version).toBe(4)
    const ownPlace = await uowInsertPlace(s.store)
    expect(await s.use.save(s.actor, s.store, tour.id, 4, { stops: [stop(1, { placeId: ownPlace })] }, null)).toMatchObject({ ok: true, value: { stops: [{ placeId: ownPlace }] } })
  })

  it('[E2.6] a retired PDF is refused and the row is unchanged', async () => {
    const s = setup()
    const tour = await draft(s)
    const retired = await media(s.store, 'pdf', 'retired')
    expect(await s.use.save(s.actor, s.store, tour.id, 1, { pdfMediaId: retired }, null)).toEqual({ ok: false, reason: 'media-retired' })
    expect(await tourRow(tour.id)).toMatchObject({ row_version: 1, pdf_media_id: tour.pdfMediaId })
    const image = await media(s.store, 'image')
    expect(await s.use.save(s.actor, s.store, tour.id, 1, { pdfMediaId: image }, null)).toEqual({ ok: false, reason: 'media-invalid' })
  })

  it('[E2.6] a draft tour with stops is deleted and its stops go with it', async () => {
    const s = setup()
    const tour = await draft(s, { stops: [stop(1), stop(2)], keepsakeProductIds: [randomUUID()] })
    expect(await count(pool, 'select count(*) from content.tour_stops where tour_id = $1', [tour.id])).toBe(2)
    expect(await s.use.remove(s.actor, s.store, tour.id, null)).toEqual({ ok: true, value: { id: tour.id } })
    expect(await count(pool, 'select count(*) from content.tours where id = $1', [tour.id])).toBe(0)
    expect(await count(pool, 'select count(*) from content.tour_stops where tour_id = $1', [tour.id])).toBe(0)
    expect(await count(pool, 'select count(*) from content.tour_keepsake_links where tour_id = $1', [tour.id])).toBe(0)
  })

  it('[E2.6] a published tour cannot be deleted and its PDF cannot be cleared', async () => {
    const s = setup()
    const tour = await draft(s)
    await s.use.publish(s.actor, s.store, tour.id, 1, null)
    expect(await s.use.remove(s.actor, s.store, tour.id, null)).toEqual({ ok: false, reason: 'published-cannot-be-deleted' })
    expect(await s.use.save(s.actor, s.store, tour.id, 2, { pdfMediaId: null }, null)).toEqual({ ok: false, reason: 'incomplete', gaps: ['pdf'] })
    expect(await tourRow(tour.id)).toMatchObject({ status: 'published', row_version: 2 })
  })

  it('[E2.6] what the database raises for a tour maps to an editor problem', async () => {
    const s = setup()
    const tour = await draft(s)
    // tours_published_fields_check: published without a PDF
    const noPdf = await s.use.create(s.actor, s.store, { slug: { en: slug() }, draft: doc('A') }, null)
    const checkError = await thrown(() => pool.query(`update content.tours set status = 'published', published = draft where id = $1`, [noPdf.ok ? noPdf.value.id : '']))
    expect(mapDatabaseError(checkError)).toEqual({ reason: 'incomplete', gaps: [] })
    // slug unique
    const other = await draft(s)
    const slugError = await thrown(() => pool.query(`update content.tours set slug = $1 where id = $2`, [JSON.stringify(tour.slug), other.id]))
    expect(mapDatabaseError(slugError)).toEqual({ reason: 'slug-taken' })
    // cover and PDF of the wrong kind, a file of another store, a stop photo of the wrong kind
    const image = await media(s.store, 'image')
    const pdf = await media(s.store, 'pdf')
    const foreign = await media(randomUUID(), 'image')
    for (const [column, id] of [['cover_media_id', pdf], ['pdf_media_id', image], ['cover_media_id', foreign]] as const) {
      const error = await thrown(() => pool.query(`update content.tours set ${column} = $1 where id = $2`, [id, tour.id]))
      expect(mapDatabaseError(error)).toEqual({ reason: 'reference-invalid' })
    }
    const stopError = await thrown(() => pool.query(
      `insert into content.tour_stops (tour_id, store_id, position, latitude, longitude, content, media_id) values ($1, $2, 1, 47, 8, '{}', $3)`,
      [tour.id, s.store, pdf],
    ))
    expect(mapDatabaseError(stopError)).toEqual({ reason: 'reference-invalid' })
  })
})

async function uowInsertPlace(store: string): Promise<string> {
  const pins = createPinRepository()
  const pin = await createUnitOfWork(db).run(tx => pins.insert(tx, store, { title: { en: 'Place' } }, new Date()))
  return pin.id
}
