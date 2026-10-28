import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { createManualClock } from '../support/manual-clock.ts'
import { createContentHttp } from './content-http.ts'
import { openTestDatabase } from './support.ts'

// A sign-in is slow against a Neon branch.
vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 })

const { pool, db } = openTestDatabase()

afterAll(async () => {
  await pool.end()
})

const moneyKey = /price|amount|cost|fee|currency|money/i
const slug = () => `h-${randomUUID().slice(0, 8)}`

// Every object key in a body, at any depth.
function keysOf(value: unknown): string[] {
  if (Array.isArray(value))
    return value.flatMap(keysOf)
  if (typeof value === 'object' && value !== null)
    return Object.entries(value).flatMap(([key, child]) => [key, ...keysOf(child)])
  return []
}

interface Seed { story: { id: string, slug: string }, pin: string, tour: { id: string, slug: string }, mapCategory: string, blogCategory: string, main: string }

const storyDoc = (title: string) => JSON.stringify({ title, excerpt: '', intro: '', authorName: '', authorRole: '', readMinutes: null, coverMediaId: null, sections: [] })

async function group(store: string, language: 'en' | 'de', status: 'draft' | 'published', title: string): Promise<{ id: string, slug: string }> {
  const { rows } = await pool.query<{ id: string }>(`insert into content.story_groups (store_id, kind) values ($1, 'story') returning id`, [store])
  const s = slug()
  await pool.query(
    `insert into content.story_versions (store_id, group_id, language, status, slug, published, published_at, draft) values ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [store, rows[0]!.id, language, status, s, status === 'published' ? storyDoc(title) : null, status === 'published' ? '2090-03-01T00:00:00Z' : null, status === 'draft' ? storyDoc(title) : null],
  )
  return { id: rows[0]!.id, slug: s }
}

async function pin(store: string, status: 'draft' | 'published' | 'hidden', name: Record<string, string>, mainStory: string | null = null): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `insert into content.places (store_id, status, slug, latitude, longitude, published, first_published_at, main_story_group_id)
     values ($1, $2, $3, 47.05, 8.3, $4, $5, $6) returning id`,
    [store, status, JSON.stringify(Object.fromEntries(Object.keys(name).map(k => [k, slug()]))), JSON.stringify({ name, tip: Object.fromEntries(Object.keys(name).map(k => [k, `Tip ${k}`])) }), status === 'draft' ? null : new Date().toISOString(), mainStory],
  )
  return rows[0]!.id
}

async function tour(store: string, status: 'draft' | 'published', title: Record<string, string>): Promise<{ id: string, slug: string }> {
  const slugs = Object.fromEntries(Object.keys(title).map(k => [k, slug()]))
  const { rows: m } = await pool.query<{ id: string }>(
    `insert into content.media (store_id, kind, storage_key, content_type, byte_size, sha256, status) values ($1, 'pdf', $2, 'application/pdf', 10, repeat('a', 64), 'ready') returning id`,
    [store, `${store}/${randomUUID()}`],
  )
  const doc = JSON.stringify({ title, summary: { en: 'Summary' }, meetingPoint: { en: 'Station' }, sections: [] })
  const { rows } = await pool.query<{ id: string }>(
    `insert into content.tours (store_id, status, slug, pdf_media_id, published, draft, duration_minutes) values ($1, $2, $3, $4, $5, $6, 90) returning id`,
    [store, status, JSON.stringify(slugs), m[0]!.id, status === 'published' ? doc : null, status === 'draft' ? doc : null],
  )
  return { id: rows[0]!.id, slug: slugs.en ?? slugs.de! }
}

async function category(table: 'map_categories' | 'blog_categories', store: string): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(`insert into content.${table} (store_id, name, slug) values ($1, '{"en":"Food","de":"Essen"}', $2) returning id`, [store, slug()])
  return rows[0]!.id
}

async function seed(store: string): Promise<Seed> {
  const story = await group(store, 'en', 'published', 'A story')
  const pinId = await pin(store, 'published', { en: 'A place', de: 'Ein Ort' }, story.id)
  return { story, pin: pinId, tour: await tour(store, 'published', { en: 'A walk' }), mapCategory: await category('map_categories', store), blogCategory: await category('blog_categories', store), main: story.id }
}

const get = (env: ReturnType<typeof createContentHttp>, path: string, headers: Record<string, string> = {}) => env.call(path, { headers })

describe('[E2.12] the public routes over the real app and the database', () => {
  it('[E2.12][AC45] the map list updates within the 60 s server cache: absent at +59 s, present at +61 s', async () => {
    const clock = createManualClock(new Date())
    const env = createContentHttp({ pool, db }, clock)
    const store = randomUUID()
    const ids = async () => ((await (await get(env, '/api/public/map?lang=en')).json()) as { items: { id: string }[] }).items.map(i => i.id)

    await ids()
    clock.advance(10_000)
    const added = await pin(store, 'published', { en: 'Late pin' })
    clock.advance(49_000)
    const at59 = await ids()
    clock.advance(2000)
    const at61 = await ids()

    expect(at59).not.toContain(added)
    expect(at61).toContain(added)
  })

  it('[E2.12][AC45] worst case: a pin published right after the cache fill shows 60 s after the fill', async () => {
    const clock = createManualClock(new Date())
    const env = createContentHttp({ pool, db }, clock)
    const store = randomUUID()
    const shows = async (id: string) => ((await (await get(env, '/api/public/map?lang=en')).json()) as { items: { id: string }[] }).items.some(i => i.id === id)

    await get(env, '/api/public/map?lang=en')
    const added = await pin(store, 'published', { en: 'Just after the fill' })
    let seen = -1
    for (let second = 1; second <= 120 && seen < 0; second++) {
      clock.advance(1000)
      if (await shows(added))
        seen = second
    }

    // Measured: the server delay is `seen` s; with the browser's max-age=30 a reader waits at most seen + 30 s.
    process.stdout.write(`[E2.12][AC45] worst-case probe: pin first shows ${seen} s after the cache fill; plus 30 s browser cache = ${seen + 30} s\n`)
    expect(seen).toBe(60)
  })

  it('[E2.12][AC45] only published items of two stores show, and no public path holds a store', async () => {
    const env = createContentHttp({ pool, db })
    const storeA = randomUUID()
    const storeB = randomUUID()
    const a = await seed(storeA)
    const b = await seed(storeB)
    const draftStory = await group(storeA, 'en', 'draft', 'Draft')
    const draftPin = await pin(storeA, 'draft', { en: 'Draft pin' })
    const hiddenPin = await pin(storeB, 'hidden', { en: 'Hidden pin' })
    const draftTour = await tour(storeA, 'draft', { en: 'Draft tour' })

    const stories = await (await get(env, '/api/public/stories?lang=en')).json() as { items: { id: string }[] }
    const tours = await (await get(env, '/api/public/tours?lang=en')).json() as { items: { id: string }[] }
    const map = await (await get(env, '/api/public/map?lang=en')).json() as { items: { id: string }[] }
    const mapCategories = await (await get(env, '/api/public/map-categories?lang=en')).json() as { items: { id: string }[] }
    const blogCategories = await (await get(env, '/api/public/blog-categories?lang=en')).json() as { items: { id: string }[] }
    const idsOf = (list: { items: { id: string }[] }) => list.items.map(i => i.id)

    expect(idsOf(stories)).toEqual(expect.arrayContaining([a.story.id, b.story.id]))
    expect(idsOf(stories)).not.toContain(draftStory.id)
    expect(idsOf(tours)).toEqual(expect.arrayContaining([a.tour.id, b.tour.id]))
    expect(idsOf(tours)).not.toContain(draftTour.id)
    expect(idsOf(map)).toEqual(expect.arrayContaining([a.pin, b.pin]))
    expect(idsOf(map)).not.toContain(draftPin)
    expect(idsOf(map)).not.toContain(hiddenPin)
    expect(idsOf(mapCategories)).toEqual(expect.arrayContaining([a.mapCategory, b.mapCategory]))
    expect(idsOf(blogCategories)).toEqual(expect.arrayContaining([a.blogCategory, b.blogCategory]))
    for (const [path, status] of [[`/api/public/stories/${a.story.slug}`, 200], [`/api/public/stories/${draftStory.slug}`, 404], [`/api/public/places/${a.pin}`, 200], [`/api/public/places/${draftPin}`, 404], [`/api/public/places/${hiddenPin}`, 404], [`/api/public/tours/${b.tour.slug}`, 200], [`/api/public/tours/${draftTour.slug}`, 404]] as const)
      expect((await get(env, `${path}?lang=en`)).status, path).toBe(status)
  })

  it('[E2.12][AC64] a story, pin and tour in English only, read as de, answer 200 in English with the marker; an unknown item is 404', async () => {
    const env = createContentHttp({ pool, db })
    const store = randomUUID()
    const s = await group(store, 'en', 'published', 'English only')
    const p = await pin(store, 'published', { en: 'English pin' })
    const t = await tour(store, 'published', { en: 'English tour' })
    const marker = { language: 'en', requestedLanguage: 'de', fallback: true, availableLanguages: ['en'] }

    const story = await (await get(env, `/api/public/stories/${s.slug}?lang=de`)).json()
    const card = await (await get(env, `/api/public/places/${p}?lang=de`)).json()
    const guide = await (await get(env, `/api/public/tours/${t.slug}?lang=de`)).json()
    const unknown = await get(env, '/api/public/stories/no-such-story?lang=de')

    expect(story).toMatchObject({ title: 'English only', ...marker })
    expect(card).toMatchObject({ title: 'English pin', ...marker })
    expect(guide).toMatchObject({ title: 'English tour', ...marker })
    expect(unknown.status).toBe(404)
    expect(unknown.headers.get('Content-Type')).toBe('application/problem+json')
  })

  it('[E2.12][AC88] a map item carries exactly the ADR-006 fields, with the main story', async () => {
    const env = createContentHttp({ pool, db })
    const store = randomUUID()
    const { pin: id, story } = await seed(store)

    const map = await (await get(env, '/api/public/map?lang=en')).json() as { items: Record<string, unknown>[] }
    const item = map.items.find(i => i.id === id)!

    expect(Object.keys(item).sort()).toEqual(['categoryIds', 'hasMainStory', 'id', 'interests', 'language', 'latitude', 'longitude', 'mainStorySlug', 'nextDate', 'photoKey', 'slug', 'stayTag', 'title'])
    expect(item).toMatchObject({ title: 'A place', hasMainStory: true, mainStorySlug: story.slug, language: 'en' })
  })

  it('[E2.12][AC54] no real response body of any public route holds a price-shaped key, and each body is non-empty', async () => {
    const env = createContentHttp({ pool, db })
    const s = await seed(randomUUID())
    const paths = ['/api/public/stories', `/api/public/stories/${s.story.slug}`, `/api/public/places/${s.pin}`, '/api/public/tours', `/api/public/tours/${s.tour.slug}`, '/api/public/map-categories', '/api/public/blog-categories', '/api/public/map']

    for (const path of paths) {
      const response = await get(env, `${path}?lang=en`)
      const body = await response.json()
      expect(response.status, path).toBe(200)
      expect(response.headers.get('Cache-Control'), path).toBe('max-age=30')
      expect(keysOf(body).length, path).toBeGreaterThan(3)
      expect(keysOf(body).filter(key => moneyKey.test(key)), path).toEqual([])
    }
  })

  it('[E2.12][AC54] a repeat with the ETag is 304 with no body over the real database', async () => {
    const env = createContentHttp({ pool, db })
    const s = await seed(randomUUID())
    const path = `/api/public/tours/${s.tour.slug}?lang=en`

    const first = await get(env, path)
    const again = await get(env, path, { 'If-None-Match': first.headers.get('ETag')! })

    expect(again.status).toBe(304)
    expect(await again.text()).toBe('')
    expect(again.headers.get('ETag')).toBe(first.headers.get('ETag'))
  })

  it('[E2.12][AC54] no public response sets a cookie, for an anonymous or a signed-in request', async () => {
    const env = createContentHttp({ pool, db })
    const s = await seed(randomUUID())
    const { headers } = await env.signIn()
    const paths = ['/api/public/stories', `/api/public/stories/${s.story.slug}`, `/api/public/places/${s.pin}`, '/api/public/tours', `/api/public/tours/${s.tour.slug}`, '/api/public/map-categories', '/api/public/blog-categories', '/api/public/map', '/api/public/map?lang=fr', '/api/public/stories/missing']

    for (const path of paths) {
      const url = path.includes('?') ? path : `${path}?lang=en`
      for (const who of [{}, headers]) {
        const response = await get(env, url, who)
        expect(response.headers.getSetCookie(), `${url} ${who === headers ? 'signed in' : 'anonymous'}`).toEqual([])
      }
    }
    const map = await get(env, '/api/public/map?lang=en', headers)
    expect(map.status).toBe(200)
  })
})
