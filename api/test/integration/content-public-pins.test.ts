import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { createPublicReadRepository } from '../../src/modules/content/adapters/public-repository.ts'
import { makeGetMap } from '../../src/modules/content/application/read-map.ts'
import { makeGetPin } from '../../src/modules/content/application/read-pins.ts'
import { systemClock } from '../../src/platform/clock.ts'
import { createUnitOfWork } from '../../src/platform/db/unit-of-work.ts'
import { openTestDatabase } from './support.ts'

vi.setConfig({ testTimeout: 60_000, hookTimeout: 120_000 })

const { pool, db } = openTestDatabase()

afterAll(async () => {
  await pool.end()
})

const deps = { uow: createUnitOfWork(db), reads: createPublicReadRepository(), clock: systemClock }
const getPin = makeGetPin(deps)

const slug = () => `p-${randomUUID().slice(0, 8)}`

interface PinOptions {
  status?: 'draft' | 'published' | 'hidden'
  name?: Record<string, string>
  slugs?: Record<string, string>
  cover?: string
  mainStory?: string
}

async function place(store: string, o: PinOptions = {}): Promise<string> {
  const status = o.status ?? 'published'
  const name = o.name ?? { en: 'Old town', de: 'Altstadt' }
  const slugs = o.slugs ?? Object.fromEntries(Object.keys(name).map(k => [k, slug()]))
  const { rows } = await pool.query<{ id: string }>(
    `insert into content.places (store_id, status, slug, latitude, longitude, published, first_published_at, cover_media_id, main_story_group_id)
     values ($1, $2, $3, 47.05, 8.3, $4, $5, $6, $7) returning id`,
    [store, status, JSON.stringify(slugs), JSON.stringify({ name, tip: Object.fromEntries(Object.keys(name).map(k => [k, `Tip ${k}`])) }), status === 'draft' ? null : new Date().toISOString(), o.cover ?? null, o.mainStory ?? null],
  )
  return rows[0]!.id
}

async function dates(store: string, placeId: string, ...days: [string, string][]) {
  for (const [first, last] of days)
    await pool.query('insert into content.place_dates (place_id, store_id, first_day, last_day) values ($1, $2, $3, $4)', [placeId, store, first, last])
}

async function mapCategory(store: string, parent: string | null = null): Promise<{ id: string, slug: string }> {
  const s = slug()
  const { rows } = await pool.query<{ id: string }>(
    `insert into content.map_categories (store_id, name, slug, parent_id) values ($1, '{"en":"Food","de":"Essen"}', $2, $3) returning id`,
    [store, s, parent],
  )
  return { id: rows[0]!.id, slug: s }
}

async function tag(store: string, placeId: string, categoryId: string) {
  await pool.query('insert into content.place_categories (place_id, category_id, store_id) values ($1, $2, $3)', [placeId, categoryId, store])
}

async function mapItems(lang: 'en' | 'de') {
  // A fresh cache for every read: the TTL is covered by the unit tests.
  return (await makeGetMap(deps)(lang)).items
}

describe('public pin reads over the database', () => {
  it('[E2.12][AC45] published pins of two stores are listed, draft and hidden ones are not, each with categories and next date', async () => {
    const storeA = randomUUID()
    const storeB = randomUUID()
    const parent = await mapCategory(storeA)
    const child = await mapCategory(storeA, parent.id)
    const a = await place(storeA)
    const b = await place(storeB)
    const draft = await place(storeA, { status: 'draft' })
    const hidden = await place(storeA, { status: 'hidden' })
    await tag(storeA, a, child.id)
    await dates(storeA, a, ['2090-11-14', '2090-11-14'])

    const items = await mapItems('en')
    const ids = items.map(i => i.id)

    expect(ids).toEqual(expect.arrayContaining([a, b]))
    expect(ids).not.toContain(draft)
    expect(ids).not.toContain(hidden)
    const listed = items.find(i => i.id === a)!
    expect(listed.categoryIds.sort()).toEqual([child.id, parent.id].sort())
    expect(listed.nextDate).toEqual({ firstDay: '2090-11-14', lastDay: '2090-11-14', startTime: null, endTime: null })
    expect(items.find(i => i.id === b)).toMatchObject({ categoryIds: [], nextDate: null, hasMainStory: false, mainStorySlug: null })
  })

  it('[E2.12][AC45] the card carries the parent category, and a hidden or draft pin by id is not found', async () => {
    const store = randomUUID()
    const parent = await mapCategory(store)
    const child = await mapCategory(store, parent.id)
    const a = await place(store)
    await tag(store, a, child.id)
    const hidden = await place(store, { status: 'hidden' })
    const draft = await place(store, { status: 'draft' })

    const card = await getPin(a, 'en')

    expect(card.ok && card.value.categories.map(c => c.id).sort()).toEqual([child.id, parent.id].sort())
    expect(await getPin(hidden, 'en')).toEqual({ ok: false, reason: 'not-found' })
    expect(await getPin(draft, 'en')).toEqual({ ok: false, reason: 'not-found' })
    expect(await getPin(randomUUID(), 'en')).toEqual({ ok: false, reason: 'not-found' })
  })

  it('[E2.12][AC64] a pin with English only, read as de, carries English', async () => {
    const store = randomUUID()
    const a = await place(store, { name: { en: 'Only English' } })

    const card = await getPin(a, 'de')
    const listed = (await mapItems('de')).find(i => i.id === a)

    expect(card.ok && card.value).toMatchObject({ title: 'Only English', tip: 'Tip en', language: 'en', requestedLanguage: 'de', fallback: true, availableLanguages: ['en'] })
    expect(listed).toMatchObject({ title: 'Only English', language: 'en' })
  })

  it('[E2.12][AC86] a pin whose last date is past is left out by the database view, one with a past and a future date shows the future one', async () => {
    const store = randomUUID()
    const past = await place(store)
    const mixed = await place(store)
    await dates(store, past, ['2020-01-01', '2020-01-02'])
    await dates(store, mixed, ['2020-01-01', '2020-01-02'], ['2090-12-01', '2090-12-02'])

    const ids = (await mapItems('en')).map(i => i.id)
    const card = await getPin(mixed, 'en')

    expect(ids).not.toContain(past)
    expect(await getPin(past, 'en')).toEqual({ ok: false, reason: 'not-found' })
    expect(ids).toContain(mixed)
    expect(card.ok && card.value.nextDate).toEqual({ firstDay: '2090-12-01', lastDay: '2090-12-02', startTime: null, endTime: null })
  })

  it('[E2.12][AC88] the main story and the cover come with the pin, in the carried language', async () => {
    const store = randomUUID()
    const { rows: g } = await pool.query<{ id: string }>(`insert into content.story_groups (store_id, kind) values ($1, 'story') returning id`, [store])
    const storyDoc = JSON.stringify({ title: 'T', excerpt: '', authorName: '', coverMediaId: null, body: { type: 'doc', content: [] } })
    const storySlug = slug()
    await pool.query(
      `insert into content.story_versions (store_id, group_id, language, status, slug, published, published_at) values ($1, $2, 'en', 'published', $3, $4, now())`,
      [store, g[0]!.id, storySlug, storyDoc],
    )
    const key = `${store}/${randomUUID()}`
    const { rows: m } = await pool.query<{ id: string }>(
      `insert into content.media (store_id, kind, storage_key, content_type, byte_size, sha256, status) values ($1, 'image', $2, 'image/jpeg', 10, repeat('a', 64), 'ready') returning id`,
      [store, key],
    )
    const a = await place(store, { cover: m[0]!.id, mainStory: g[0]!.id })
    const noStory = await place(store)

    const items = await mapItems('en')

    expect(items.find(i => i.id === a)).toMatchObject({ hasMainStory: true, mainStorySlug: storySlug, photoKey: key })
    expect(items.find(i => i.id === noStory)).toMatchObject({ hasMainStory: false, mainStorySlug: null, photoKey: null })
  })
})
