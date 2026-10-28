import type { StoryDraft } from '@sk/domain/content'
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

const deps = { uow: createUnitOfWork(db), reads: createPublicReadRepository(), clock: systemClock }
const list = makeListStories(deps)
const get = makeGetStory(deps)
const categories = makeListCategories(deps)

const slug = () => `s-${randomUUID().slice(0, 8)}`
const doc = (title: string, over: Partial<StoryDraft> = {}): StoryDraft => ({ title, excerpt: '', intro: '', authorName: '', authorRole: '', readMinutes: null, coverMediaId: null, sections: [], ...over })

async function group(store: string): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(`insert into content.story_groups (store_id, kind) values ($1, 'story') returning id`, [store])
  return rows[0]!.id
}

async function version(store: string, groupId: string, language: 'en' | 'de', status: 'draft' | 'published', title: string, over: { slug?: string, published?: StoryDraft | null, draft?: StoryDraft | null } = {}): Promise<string> {
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
      published: doc('With pictures', { coverMediaId: ready.rows[0]!.id, sections: [{ id: 'a', heading: 'H', blocks: [{ type: 'image', mediaId: processing.rows[0]!.id, caption: '' }] }] }),
    })

    const result = await get(s, 'en')

    expect(result.ok && result.value.coverKey).toBe(readyKey)
    expect(result.ok && result.value.sections[0]!.blocks[0]).toEqual({ type: 'image', key: null, caption: '' })
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
      { id: parent.id, slug: parent.slug, name: { en: 'Food', de: 'Essen' }, parentId: null, position: 1 },
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
      published: doc('Capitals', { coverMediaId: upper, sections: [{ id: 'a', heading: 'H', blocks: [{ type: 'image', mediaId: upper, caption: '' }] }] }),
    })

    const result = await get(s, 'en')

    expect(result.ok && result.value.coverKey).toBe(rows[0]!.storage_key)
    expect(result.ok && result.value.sections[0]!.blocks[0]).toEqual({ type: 'image', key: rows[0]!.storage_key, caption: '' })
  })

  it('[E2.12][AC64] an unpublished German version with old text does not count: English is carried and only English is available', async () => {
    const store = randomUUID()
    const g = await group(store)
    const enSlug = await version(store, g, 'en', 'published', 'English')
    await version(store, g, 'de', 'draft', 'Alt', { published: doc('Alter Text') })

    const result = await get(enSlug, 'de')

    expect(result.ok && result.value).toMatchObject({ title: 'English', language: 'en', requestedLanguage: 'de', fallback: true, availableLanguages: ['en'] })
  })
})
