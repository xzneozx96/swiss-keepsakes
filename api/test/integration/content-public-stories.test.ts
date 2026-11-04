import type { StoredStoryDoc } from '../../src/modules/content/read-ports.ts'
import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { createPublicReadRepository } from '../../src/modules/content/adapters/public-repository.ts'
import { makeListCategories } from '../../src/modules/content/application/read-categories.ts'
import { makeGetStory, makeListStories } from '../../src/modules/content/application/read-stories.ts'
import { systemClock } from '../../src/platform/clock.ts'
import { createUnitOfWork } from '../../src/platform/db/unit-of-work.ts'
import { openTestDatabase } from './support.ts'

vi.setConfig({ testTimeout: 60_000, hookTimeout: 120_000 })

const { pool, db } = openTestDatabase()

afterAll(async () => {
  await pool.end()
})

const deps = { uow: createUnitOfWork(db), reads: createPublicReadRepository(), clock: systemClock, publicUrl: (key: string) => `https://media.test/${key}` }
const list = makeListStories(deps)
// The catalog's part is a port filled in main.ts; here it answers with a card for each id it is given.
const keepsakeAsks: string[][] = []
const get = makeGetStory({ ...deps, keepsakeCards: async (ids) => {
  keepsakeAsks.push(ids)
  return ids.map(id => ({ id, slug: `k-${id.slice(0, 4)}`, name: 'Keepsake', cover: null, soldOut: false }))
} })
const categories = makeListCategories(deps)

const slug = () => `s-${randomUUID().slice(0, 8)}`
const doc = (title: string, over: Partial<StoredStoryDoc> = {}): StoredStoryDoc => ({ title, excerpt: '', authorName: '', coverMediaId: null, body: { type: 'doc', content: [] }, ...over })

async function group(store: string): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(`insert into content.story_groups (store_id, kind) values ($1, 'story') returning id`, [store])
  return rows[0]!.id
}

async function version(store: string, groupId: string, language: 'en' | 'de', status: 'draft' | 'published', title: string, over: { slug?: string, published?: StoredStoryDoc | null, draft?: StoredStoryDoc | null } = {}): Promise<string> {
  const s = over.slug ?? slug()
  const published = over.published === undefined ? (status === 'published' ? doc(title) : null) : over.published
  await pool.query(
    `insert into content.story_versions (store_id, group_id, language, status, slug, published, published_at, draft)
     values ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [store, groupId, language, status, s, published && JSON.stringify(published), published ? '2090-03-01T00:00:00Z' : null, over.draft ? JSON.stringify(over.draft) : null],
  )
  return s
}

async function blogCategory(store: string, name: object): Promise<{ id: string, slug: string }> {
  const s = slug()
  const { rows } = await pool.query<{ id: string }>(`insert into content.blog_categories (store_id, name, slug) values ($1, $2, $3) returning id`, [store, JSON.stringify(name), s])
  return { id: rows[0]!.id, slug: s }
}

async function tag(store: string, groupId: string, categoryId: string) {
  await pool.query('insert into content.story_categories (group_id, category_id, store_id) values ($1, $2, $3)', [groupId, categoryId, store])
}

describe('public story reads over the database', () => {
  it('[E2.12][G-S5-REVIEWSLIST] a published editorial_review group is listed in /api/public/stories like a story', async () => {
    // Owner gate G-S5-REVIEWSLIST: editorial reviews stay in the public list. Do not filter on kind.
    const store = randomUUID()
    const place = (await pool.query<{ id: string }>(`insert into content.places (store_id) values ($1) returning id`, [store])).rows[0]!.id
    const { rows } = await pool.query<{ id: string }>(`insert into content.story_groups (store_id, kind, subject_place_id) values ($1, 'editorial_review', $2) returning id`, [store, place])
    const g = rows[0]!.id
    const s = await version(store, g, 'en', 'published', 'Chapel Bridge review')

    const listed = (await list('en')).items.find(i => i.id === g)

    expect(listed).toMatchObject({ slug: s, title: 'Chapel Bridge review' })
  })

  it('[E2.12][AC45] a story edited and republished reads the new text at once', async () => {
    const store = randomUUID()
    const g = await group(store)
    const s = await version(store, g, 'en', 'published', 'First text')

    const before = await get(s, 'en')
    await pool.query(`update content.story_versions set published = $3 where group_id = $1 and language = $2`, [g, 'en', JSON.stringify(doc('Second text'))])
    const after = await get(s, 'en')
    const listed = (await list('en')).items.find(i => i.id === g)

    expect(before.ok && before.value.title).toBe('First text')
    expect(after.ok && after.value.title).toBe('Second text')
    expect(listed?.title).toBe('Second text')
  })

  it('[E2.12][AC45] only published stories appear, across two stores, each with its blog categories', async () => {
    const storeA = randomUUID()
    const storeB = randomUUID()
    const a = await group(storeA)
    const b = await group(storeB)
    const draftOnly = await group(storeA)
    const unpublished = await group(storeB)
    const catA = await blogCategory(storeA, { en: 'Food', de: 'Essen' })
    const catB = await blogCategory(storeB, { en: 'Walks', de: 'Wanderungen' })
    await version(storeA, a, 'en', 'published', 'Story A')
    await version(storeB, b, 'en', 'published', 'Story B')
    await version(storeA, draftOnly, 'en', 'draft', 'Never published', { draft: doc('Never published') })
    const oldSlug = await version(storeB, unpublished, 'en', 'draft', 'Old text', { published: doc('Old published text') })
    await tag(storeA, a, catA.id)
    await tag(storeB, b, catB.id)

    const { items } = await list('en')
    const byId = new Map(items.map(i => [i.id, i]))

    expect(byId.get(a)?.categories).toEqual([{ id: catA.id, slug: catA.slug, name: 'Food' }])
    expect(byId.get(b)?.categories).toEqual([{ id: catB.id, slug: catB.slug, name: 'Walks' }])
    expect(byId.has(draftOnly)).toBe(false)
    expect(byId.has(unpublished)).toBe(false)
    expect(await get(oldSlug, 'en')).toEqual({ ok: false, reason: 'not-found' })
  })

  it('[E2.12][AC64] a slug of the other language is found, and says which language it carries', async () => {
    const store = randomUUID()
    const g = await group(store)
    const enSlug = await version(store, g, 'en', 'published', 'English only')

    const result = await get(enSlug, 'de')

    expect(result.ok && result.value).toMatchObject({ id: g, language: 'en', requestedLanguage: 'de', fallback: true, availableLanguages: ['en'] })
  })

  it('[E2.12][AC64] with both languages the asked one is carried, whichever slug was used', async () => {
    const store = randomUUID()
    const g = await group(store)
    const enSlug = await version(store, g, 'en', 'published', 'English')
    const deSlug = await version(store, g, 'de', 'published', 'Deutsch')

    const viaEn = await get(enSlug, 'de')
    const viaDe = await get(deSlug, 'en')

    expect(viaEn.ok && viaEn.value).toMatchObject({ title: 'Deutsch', language: 'de', fallback: false, availableLanguages: ['de', 'en'] })
    expect(viaDe.ok && viaDe.value).toMatchObject({ title: 'English', language: 'en', fallback: false })
  })

  it('[E2.12][AC45] media show as the storage key of a ready row and null otherwise', async () => {
    const store = randomUUID()
    const g = await group(store)
    const ready = await pool.query<{ id: string }>(
      `insert into content.media (store_id, kind, storage_key, content_type, byte_size, sha256, status) values ($1, 'image', $2, 'image/jpeg', 10, repeat('a', 64), 'ready') returning id`,
      [store, `${store}/${randomUUID()}`],
    )
    const processing = await pool.query<{ id: string }>(
      `insert into content.media (store_id, kind, storage_key, content_type, byte_size, sha256, status) values ($1, 'image', $2, 'image/jpeg', 10, repeat('b', 64), 'processing') returning id`,
      [store, `${store}/${randomUUID()}`],
    )
    const readyKey = (await pool.query<{ storage_key: string }>('select storage_key from content.media where id = $1', [ready.rows[0]!.id])).rows[0]!.storage_key
    const s = await version(store, g, 'en', 'published', 'With pictures', {
      published: doc('With pictures', { coverMediaId: ready.rows[0]!.id, body: { type: 'doc', content: [{ type: 'image', attrs: { mediaId: processing.rows[0]!.id, alt: '', caption: '' } }] } }),
    })

    const result = await get(s, 'en')

    expect(result.ok && result.value.coverKey).toBe(readyKey)
    expect(result.ok && result.value.body.content[0]).toEqual({ type: 'image', attrs: { key: null, url: null, variants: [], alt: '', caption: '' } })
  })

  it('[E2.12][AC45] a media id of another store is not resolved', async () => {
    const store = randomUUID()
    const other = randomUUID()
    const g = await group(store)
    const foreign = await pool.query<{ id: string }>(
      `insert into content.media (store_id, kind, storage_key, content_type, byte_size, sha256, status) values ($1, 'image', $2, 'image/jpeg', 10, repeat('c', 64), 'ready') returning id`,
      [other, `${other}/${randomUUID()}`],
    )
    const s = await version(store, g, 'en', 'published', 'Foreign picture', { published: doc('Foreign picture', { coverMediaId: foreign.rows[0]!.id }) })

    const result = await get(s, 'en')

    expect(result.ok && result.value.coverKey).toBeNull()
  })

  it('[E2.12][AC45] the category lists carry both names, parents before children', async () => {
    const store = randomUUID()
    const parent = await blogCategory(store, { en: 'Food', de: 'Essen' })
    const child = await pool.query<{ id: string }>(
      `insert into content.blog_categories (store_id, name, slug, parent_id) values ($1, $2, $3, $4) returning id`,
      [store, JSON.stringify({ en: 'Cafes', de: 'Cafés' }), slug(), parent.id],
    )

    const { items } = await categories('blog')
    const ours = items.filter(i => i.id === parent.id || i.id === child.rows[0]!.id)

    expect(ours).toEqual([
      { id: parent.id, slug: parent.slug, name: { en: 'Food', de: 'Essen' }, parentId: null, icon: null, showOnHome: false, position: 1 },
      expect.objectContaining({ id: child.rows[0]!.id, name: { en: 'Cafes', de: 'Cafés' }, parentId: parent.id }),
    ])
    expect((await categories('map')).items.some(i => i.id === parent.id)).toBe(false)
  })

  it('[E2.12][AC45] a media id saved in capitals still finds its key', async () => {
    const store = randomUUID()
    const g = await group(store)
    const { rows } = await pool.query<{ id: string, storage_key: string }>(
      `insert into content.media (store_id, kind, storage_key, content_type, byte_size, sha256, status) values ($1, 'image', $2, 'image/jpeg', 10, repeat('c', 64), 'ready') returning id, storage_key`,
      [store, `${store}/${randomUUID()}`],
    )
    const upper = rows[0]!.id.toUpperCase()
    const s = await version(store, g, 'en', 'published', 'Capitals', {
      published: doc('Capitals', { coverMediaId: upper, body: { type: 'doc', content: [{ type: 'image', attrs: { mediaId: upper, alt: '', caption: '' } }] } }),
    })

    const result = await get(s, 'en')

    expect(result.ok && result.value.coverKey).toBe(rows[0]!.storage_key)
    expect(result.ok && result.value.body.content[0]).toEqual({ type: 'image', attrs: { key: rows[0]!.storage_key, url: `https://media.test/${rows[0]!.storage_key}`, variants: expect.any(Array), alt: '', caption: '' } })
  })

  it('[E2.12][AC64] an unpublished German version with old text does not count: English is carried and only English is available', async () => {
    const store = randomUUID()
    const g = await group(store)
    const enSlug = await version(store, g, 'en', 'published', 'English')
    await version(store, g, 'de', 'draft', 'Alt', { published: doc('Alter Text') })

    const result = await get(enSlug, 'de')

    expect(result.ok && result.value).toMatchObject({ title: 'English', language: 'en', requestedLanguage: 'de', fallback: true, availableLanguages: ['en'] })
  })

  it('[E2.12][AC45] a stored document with a block that has no media id does not break the reads', async () => {
    const store = randomUUID()
    const g = await group(store)
    const odd = doc('Odd shape', { body: { type: 'doc', content: [{ type: 'image', attrs: { caption: 'no id' } }, { type: 'audio', attrs: { mediaId: 'not-a-uuid', title: 't' } }, 'nope'] } })
    const s = await version(store, g, 'en', 'published', 'Odd shape', { published: odd })

    const detail = await get(s, 'en')
    const listed = (await list('en')).items.find(i => i.id === g)

    expect(listed?.title).toBe('Odd shape')
    expect(detail.ok && detail.value.body.content).toEqual([{ type: 'image', attrs: { key: null, url: null, variants: [], alt: '', caption: 'no id' } }, { type: 'audio', attrs: { key: null, url: null, title: 't', caption: '' } }])
  })

  it('[E2.12][AC45] a published document with only a title and an empty body (the minimum the database accepts) reads', async () => {
    const store = randomUUID()
    const g = await group(store)
    const s = await version(store, g, 'en', 'published', 'Minimal', { published: { title: 'Minimal', body: { type: 'doc' } } })

    const detail = await get(s, 'en')

    expect(detail.ok && detail.value).toMatchObject({ title: 'Minimal', excerpt: '', coverKey: null, readMinutes: 1, body: { type: 'doc', content: [] } })
  })

  it('[E4.4][AC30][AC61] AC-1: the detail lists every published version with its slug; a draft German version is not listed', async () => {
    const store = randomUUID()
    const g = await group(store)
    const en = await version(store, g, 'en', 'published', 'Lake day')
    const de = await version(store, g, 'de', 'published', 'Seetag')
    const only = await group(store)
    const onlyEn = await version(store, only, 'en', 'published', 'English only')
    await version(store, only, 'de', 'draft', 'Entwurf')

    const both = await get(en, 'en')
    const one = await get(onlyEn, 'en')

    expect(both.ok && both.value.versions).toEqual([{ language: 'de', slug: de }, { language: 'en', slug: en }])
    expect(one.ok && one.value.versions).toEqual([{ language: 'en', slug: onlyEn }])
  })

  it('[E4.4][AC33] AC-3: related stories come in the editor order, a draft one is left out, German is carried where it exists', async () => {
    const store = randomUUID()
    const g = await group(store)
    await version(store, g, 'en', 'published', 'Main')
    const mainDe = await version(store, g, 'de', 'published', 'Haupt')
    const a = await group(store)
    await version(store, a, 'en', 'published', 'A')
    const aDe = await version(store, a, 'de', 'published', 'A de')
    const draft = await group(store)
    await version(store, draft, 'en', 'draft', 'Draft')
    const c = await group(store)
    const cEn = await version(store, c, 'en', 'published', 'C')
    for (const [position, id] of [[1, c], [2, draft], [3, a]] as const)
      await pool.query('insert into content.story_related (group_id, store_id, position, related_group_id) values ($1, $2, $3, $4)', [g, store, position, id])

    const found = await get(mainDe, 'de')

    expect(found.ok && found.value.related.map(r => [r.id, r.slug, r.language])).toEqual([[c, cEn, 'en'], [a, aDe, 'de']])
  })

  it('[E4.4][AC61] AC-4: the place tags hold the visible pins in the editor order, not an expired, a hidden or a draft one', async () => {
    const store = randomUUID()
    const g = await group(store)
    const s = await version(store, g, 'en', 'published', 'Tagging')
    const pin = async (status: 'draft' | 'published' | 'hidden', name: string) => (await pool.query<{ id: string }>(
      `insert into content.places (store_id, status, slug, latitude, longitude, published, first_published_at)
       values ($1, $2, $3, 47.05, 8.3, $4, $5) returning id`,
      [store, status, JSON.stringify({ en: slug() }), JSON.stringify({ name: { en: name }, tip: { en: 'Tip' } }), status === 'draft' ? null : new Date().toISOString()],
    )).rows[0]!.id
    const visible = await pin('published', 'Visible')
    const expired = await pin('published', 'Expired')
    const hidden = await pin('hidden', 'Hidden')
    const draft = await pin('draft', 'Draft')
    const second = await pin('published', 'Second')
    await pool.query('insert into content.place_dates (place_id, store_id, first_day, last_day) values ($1, $2, $3, $4)', [expired, store, '2020-01-01', '2020-01-02'])
    for (const [position, id] of [[1, visible], [2, expired], [3, hidden], [4, draft], [5, second]] as const)
      await pool.query('insert into content.story_group_places (group_id, place_id, store_id, position) values ($1, $2, $3, $4)', [g, id, store, position])

    const found = await get(s, 'en')

    expect(found.ok && found.value.places.map(p => [p.id, p.name])).toEqual([[visible, 'Visible'], [second, 'Second']])
  })

  it('[E4.4][AC31] AC-2: the linked keepsake ids reach the port in the editor order, and a story with none asks for nothing', async () => {
    const store = randomUUID()
    const g = await group(store)
    const s = await version(store, g, 'en', 'published', 'Linking')
    const bare = await group(store)
    const bareSlug = await version(store, bare, 'en', 'published', 'Bare')
    const ids = [randomUUID(), randomUUID(), randomUUID()]
    for (const [i, id] of ids.entries())
      await pool.query('insert into content.story_keepsake_links (group_id, store_id, position, product_id) values ($1, $2, $3, $4)', [g, store, 3 - i, id])
    keepsakeAsks.length = 0

    const found = await get(s, 'en')
    const none = await get(bareSlug, 'en')

    expect(keepsakeAsks).toEqual([[...ids].reverse()])
    expect(found.ok && found.value.keepsakes.map(k => k.id)).toEqual([...ids].reverse())
    expect(none.ok && none.value.keepsakes).toEqual([])
  })
})
