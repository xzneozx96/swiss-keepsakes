import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { createPublicReadRepository } from '../../src/modules/content/adapters/public-repository.ts'
import { makeGetTour, makeListTours } from '../../src/modules/content/application/read-tours.ts'
import { systemClock } from '../../src/platform/clock.ts'
import { createUnitOfWork } from '../../src/platform/db/unit-of-work.ts'
import { openTestDatabase } from './support.ts'

vi.setConfig({ testTimeout: 60_000, hookTimeout: 120_000 })

const { pool, db } = openTestDatabase()

afterAll(async () => {
  await pool.end()
})

const deps = { uow: createUnitOfWork(db), reads: createPublicReadRepository(), clock: systemClock }
const listTours = makeListTours(deps)
const getTour = makeGetTour(deps)

const slug = () => `t-${randomUUID().slice(0, 8)}`

async function media(store: string, kind: 'image' | 'pdf', status = 'ready'): Promise<{ id: string, key: string }> {
  const key = `${store}/${randomUUID()}`
  const { rows } = await pool.query<{ id: string }>(
    `insert into content.media (store_id, kind, storage_key, content_type, byte_size, sha256, status) values ($1, $2, $3, $4, 10, repeat('a', 64), 'ready') returning id`,
    [store, kind, key, kind === 'pdf' ? 'application/pdf' : 'image/jpeg'],
  )
  if (status === 'retired')
    await pool.query(`update content.media set status = 'retired', retired_at = now() where id = $1`, [rows[0]!.id])
  return { id: rows[0]!.id, key }
}

interface TourOptions { status?: 'draft' | 'published', title?: Record<string, string>, cover?: string | null, pdf?: string | null }

async function tour(store: string, o: TourOptions = {}): Promise<{ id: string, slugs: Record<string, string> }> {
  const status = o.status ?? 'published'
  const title = o.title ?? { en: 'Old town walk', de: 'Altstadtspaziergang' }
  const slugs = Object.fromEntries(Object.keys(title).map(k => [k, slug()]))
  const pdf = o.pdf === undefined ? (await media(store, 'pdf')).id : o.pdf
  const doc = { title, summary: Object.fromEntries(Object.keys(title).map(k => [k, `Summary ${k}`])), meetingPoint: Object.fromEntries(Object.keys(title).map(k => [k, `Station ${k}`])), sections: [{ id: 's1', heading: { en: 'Heading' }, body: { en: 'Body' } }] }
  const { rows } = await pool.query<{ id: string }>(
    `insert into content.tours (store_id, status, slug, pdf_media_id, cover_media_id, published, draft, duration_minutes)
     values ($1, $2, $3, $4, $5, $6, $7, 90) returning id`,
    [store, status, JSON.stringify(slugs), pdf, o.cover ?? null, status === 'published' ? JSON.stringify(doc) : null, status === 'draft' ? JSON.stringify(doc) : null],
  )
  return { id: rows[0]!.id, slugs }
}

describe('public tour guide reads over the database', () => {
  it('[E2.12][AC64] a guide with English only, read as de, carries English, with stops, cover and pdf keys', async () => {
    const store = randomUUID()
    const cover = await media(store, 'image')
    const pdf = await media(store, 'pdf')
    const t = await tour(store, { title: { en: 'English walk' }, cover: cover.id, pdf: pdf.id })
    const visible = (await pool.query<{ id: string }>(
      `insert into content.places (store_id, status, slug, latitude, longitude, published, first_published_at) values ($1, 'published', '{"en":"x"}', 47, 8, '{"name":{"en":"X"}}', now()) returning id`,
      [store],
    )).rows[0]!.id
    const hidden = (await pool.query<{ id: string }>(
      `insert into content.places (store_id, status, slug, latitude, longitude, published, first_published_at) values ($1, 'hidden', '{"en":"y"}', 47, 8, '{"name":{"en":"Y"}}', now()) returning id`,
      [store],
    )).rows[0]!.id
    await pool.query(
      `insert into content.tour_stops (tour_id, store_id, position, latitude, longitude, content, minutes_from_start, place_id) values
       ($1, $2, 1, 47.05, 8.3, '{"title":{"en":"Chapel Bridge"},"text":{"en":"Wooden"}}', 0, $3),
       ($1, $2, 2, 47.06, 8.31, '{"title":{"en":"Hidden stop"},"text":{"en":"..."}}', 15, $4)`,
      [t.id, store, visible, hidden],
    )

    const detail = await getTour(t.slugs.en!, 'de')
    const listed = (await listTours('de')).items.find(i => i.id === t.id)

    expect(listed).toMatchObject({ title: 'English walk', slug: t.slugs.en, language: 'en', fallback: true, availableLanguages: ['en'], durationMinutes: 90, coverKey: cover.key })
    expect(detail.ok && detail.value).toMatchObject({
      summary: 'Summary en',
      meetingPoint: 'Station en',
      pdfKey: pdf.key,
      stops: [
        { position: 1, title: 'Chapel Bridge', text: 'Wooden', minutesFromStart: 0, placeId: visible },
        { position: 2, title: 'Hidden stop', minutesFromStart: 15, placeId: null },
      ],
    })
  })

  it('[E2.12][AC64] a draft guide is not listed and its slug is a 404', async () => {
    const store = randomUUID()
    const draft = await tour(store, { status: 'draft' })
    const published = await tour(store)

    const ids = (await listTours('en')).items.map(i => i.id)

    expect(ids).toContain(published.id)
    expect(ids).not.toContain(draft.id)
    expect(await getTour(draft.slugs.en!, 'en')).toEqual({ ok: false, reason: 'not-found' })
    expect(await getTour(`nope-${randomUUID()}`, 'en')).toEqual({ ok: false, reason: 'not-found' })
  })

  it('[E2.12][AC64] a guide with both languages is found by the other language slug and carries the asked language', async () => {
    const store = randomUUID()
    const t = await tour(store)

    const detail = await getTour(t.slugs.en!, 'de')

    expect(detail.ok && detail.value).toMatchObject({ slug: t.slugs.de, title: 'Altstadtspaziergang', language: 'de', fallback: false })
  })
})
