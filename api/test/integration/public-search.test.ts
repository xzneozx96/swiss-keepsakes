import type { SearchHit, SearchKey } from '../../src/modules/content/read-ports.ts'
import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { createPublicKeepsakeReads } from '../../src/modules/catalog/adapters/public-repository.ts'
import { makeSearchKeepsakeHits } from '../../src/modules/catalog/application/public-keepsakes.ts'
import { createPublicReadRepository } from '../../src/modules/content/adapters/public-repository.ts'
import { makeSearchPublic } from '../../src/modules/content/application/search-public.ts'
import { systemClock } from '../../src/platform/clock.ts'
import { createUnitOfWork } from '../../src/platform/db/unit-of-work.ts'
import { openTestDatabase } from './support.ts'

// ADR-033 slice 6: the search over the database (needs migration 0028).
vi.setConfig({ testTimeout: 60_000, hookTimeout: 120_000 })

const { pool, db } = openTestDatabase()

afterAll(async () => {
  await pool.end()
})

const uow = createUnitOfWork(db)
const reads = createPublicReadRepository()
const keepsakeReads = createPublicKeepsakeReads()
const search = makeSearchPublic({
  uow,
  reads,
  clock: systemClock,
  publicUrl: key => `https://media.test/${key}`,
  keepsakes: {
    hits: makeSearchKeepsakeHits({ uow, reads: keepsakeReads, media: { find: async () => [] } }),
    // The cards need a media port and stock; these tests read ids, so a bare card is enough.
    cards: async (ids, language) => ids.map(id => ({ id, slug: `k-${id.slice(0, 8)}`, name: 'Keepsake', cover: null, soldOut: false, language, requestedLanguage: language, fallback: false, availableLanguages: [language] })),
  },
})

// The data is global and test files share one database, so each test searches a word of its own: letters only, so the
// tokenizer keeps it whole.
const word = () => Array.from(randomUUID().replaceAll('-', '').slice(0, 12), c => String.fromCharCode(97 + Number.parseInt(c, 16))).join('')
const slug = () => `s-${randomUUID().slice(0, 8)}`
const rich = (text: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] })

async function story(store: string, title: string, over: { status?: 'draft' | 'published', interests?: string[], language?: 'en' | 'de' } = {}): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(`insert into content.story_groups (store_id, kind, interests) values ($1, 'story', $2) returning id`, [store, over.interests ?? []])
  const status = over.status ?? 'published'
  await pool.query(
    `insert into content.story_versions (store_id, group_id, language, status, slug, published, published_at) values ($1, $2, $3, $4, $5, $6, $7)`,
    [store, rows[0]!.id, over.language ?? 'en', status, slug(), status === 'published' ? JSON.stringify({ title, excerpt: '', authorName: '', coverMediaId: null, body: { type: 'doc', content: [] } }) : null, status === 'published' ? '2090-03-01T00:00:00Z' : null],
  )
  return rows[0]!.id
}

async function place(store: string, name: Record<string, string>): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `insert into content.places (store_id, status, slug, latitude, longitude, published, first_published_at) values ($1, 'published', $2, 47.05, 8.3, $3, now()) returning id`,
    [store, JSON.stringify(Object.fromEntries(Object.keys(name).map(k => [k, slug()]))), JSON.stringify({ name, tip: Object.fromEntries(Object.keys(name).map(k => [k, 'Tip'])) })],
  )
  return rows[0]!.id
}

async function tour(store: string, title: Record<string, string>): Promise<string> {
  const pdf = (await pool.query<{ id: string }>(
    `insert into content.media (store_id, kind, storage_key, content_type, byte_size, sha256, status) values ($1, 'pdf', $2, 'application/pdf', 10, repeat('a', 64), 'ready') returning id`,
    [store, `${store}/${randomUUID()}`],
  )).rows[0]!.id
  const { rows } = await pool.query<{ id: string }>(
    `insert into content.tours (store_id, status, slug, pdf_media_id, published, duration_minutes) values ($1, 'published', $2, $3, $4, 90) returning id`,
    [store, JSON.stringify(Object.fromEntries(Object.keys(title).map(k => [k, slug()]))), pdf, JSON.stringify({ title, summary: { en: 'S' }, meetingPoint: { en: 'M' }, sections: [] })],
  )
  return rows[0]!.id
}

async function keepsake(store: string, name: Record<string, string>): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `insert into catalog.products (store_id, status, slug, published) values ($1, 'published', $2, $3) returning id`,
    [store, JSON.stringify(Object.fromEntries(Object.keys(name).map(k => [k, slug()]))), JSON.stringify({ name, text: Object.fromEntries(Object.keys(name).map(k => [k, rich('Text')])) })],
  )
  return rows[0]!.id
}

const idsOf = async (query: Parameters<typeof search>[0]) => (await search(query)).items.map(item => item.card.id)

describe('the public search over the database', () => {
  it('[ADR-033] Loewendenkmal, Lowendenkmal and Löwendenkmal all find Löwendenkmal, in a story, a place, a tour and a keepsake', async () => {
    const store = randomUUID()
    const tag = word()
    const made = [await story(store, `${tag} Löwendenkmal`), await place(store, { en: `${tag} Löwendenkmal` }), await tour(store, { de: `${tag} Löwendenkmal` }), await keepsake(store, { de: `${tag} Löwendenkmal` })]

    for (const q of [`${tag} Loewendenkmal`, `${tag} Lowendenkmal`, `${tag} Löwendenkmal`, `${tag} LÖWENDENKMAL`])
      expect((await idsOf({ language: 'en', q, interest: null, limit: 20 })).sort(), q).toEqual([...made].sort())
  })

  it('[ADR-033] a partial word and a typo still match; a different word does not', async () => {
    const store = randomUUID()
    const tag = word()
    const id = await story(store, `${tag} Kapellbrücke`)
    // The other tests' rows share the database, so these look for this test's id among the hits, and search the word alone:
    // the shared tag would add trigram similarity to every title that has it.
    const found = async (q: string) => (await idsOf({ language: 'en', q, interest: null, limit: 20 })).includes(id)

    expect(await found('Kapellbr')).toBe(true)
    expect(await found('Kapelbrucke')).toBe(true)
    expect(await found('Rathaus')).toBe(false)
  })

  it('[ADR-033] English and German words are stemmed: "bridges" finds "bridge", "Brücken" finds "Brücke", and not the other language\'s title', async () => {
    const store = randomUUID()
    const en = await story(store, `${word()} old bridge`)
    const de = await story(store, `${word()} alte Brücke`, { language: 'de' })
    const hits = async (q: string, language: 'en' | 'de') => await idsOf({ language, q, interest: null, limit: 20 })

    expect(await hits('bridges', 'en')).toContain(en)
    expect(await hits('Brücken', 'de')).toContain(de)
    expect(await hits('Brücken', 'de')).not.toContain(en)
  })

  it('[ADR-033] a draft story and an unpublished tour or keepsake are never found, and a count does not include them', async () => {
    const store = randomUUID()
    const tag = word()
    const live = await story(store, `${tag} live`)
    await story(store, `${tag} draft`, { status: 'draft' })
    await pool.query(`insert into catalog.products (store_id, status, slug, draft) values ($1, 'draft', null, $2)`, [store, JSON.stringify({ name: { en: `${tag} draft` } })])

    const page = await search({ language: 'en', q: tag, interest: null, limit: 20 })

    expect(page.items.map(i => i.card.id)).toEqual([live])
    expect(page.counts).toEqual({ story: 1, place: 0, tour: 0, keepsake: 0 })
  })

  it('[ADR-033] kind narrows the hits and total, while counts still cover every kind', async () => {
    const store = randomUUID()
    const tag = word()
    const s = await story(store, `${tag} one`)
    await tour(store, { en: `${tag} two` })

    const page = await search({ language: 'en', q: tag, kind: 'story', interest: null, limit: 20 })

    expect(page.items.map(i => i.card.id)).toEqual([s])
    expect(page.total).toBe(1)
    expect(page.counts).toMatchObject({ story: 1, tour: 1 })
  })

  it('[ADR-033] an interest alone lists the newest first across kinds; a keepsake only for shopping-keepsakes', async () => {
    const store = randomUUID()
    const interest = 'food-drink'
    const first = await story(store, word(), { interests: [interest] })
    const second = await story(store, word(), { interests: [interest] })
    await story(store, word(), { interests: ['lake-mountains'] })

    const ids = await idsOf({ language: 'en', q: null, interest, limit: 20 })

    expect(ids.indexOf(second)).toBeLessThan(ids.indexOf(first))
    expect(ids).not.toContain(await keepsake(store, { en: word() }))
    expect((await search({ language: 'en', q: null, interest: 'shopping-keepsakes', kind: 'keepsake', limit: 20 })).counts.keepsake).toBeGreaterThan(0)
  })

  it('[ADR-033] walking with limit 2 gives each hit once, in the order of one full read, with a rank that never rises', async () => {
    const store = randomUUID()
    const tag = word()
    // Equal ranks (same title) and different ranks (longer titles) across the four kinds.
    for (let index = 0; index < 3; index += 1) {
      await story(store, `${tag} ${'x'.repeat(index)}`)
      await tour(store, { en: `${tag} ${'y'.repeat(index)}` })
      await place(store, { en: `${tag} ${'z'.repeat(index)}` })
      await keepsake(store, { en: `${tag} ${'w'.repeat(index)}` })
    }

    const whole = await idsOf({ language: 'en', q: tag, interest: null, limit: 20 })
    const walked: string[] = []
    const keys: SearchKey[] = []
    let after: SearchKey | undefined
    do {
      const found: Awaited<ReturnType<typeof search>> = await search({ language: 'en', q: tag, interest: null, limit: 2, after })
      walked.push(...found.items.map(i => i.card.id))
      after = found.next ?? undefined
      if (after)
        keys.push(after)
    } while (after)

    expect(whole).toHaveLength(12)
    expect(walked).toEqual(whole)
    expect(new Set(walked).size).toBe(12)
    const ranks = keys.map(key => Number(key[0]))
    expect([...ranks].sort((a, b) => b - a)).toEqual(ranks)
  })

  it('[ADR-033] the rank in the cursor is the exact double: a hit sitting on the page boundary is neither repeated nor skipped', async () => {
    const store = randomUUID()
    const tag = word()
    for (let index = 0; index < 6; index += 1)
      await story(store, `${tag} same`)

    const hits: SearchHit[] = []
    let after: SearchKey | undefined
    do {
      const found = await uow.run(tx => reads.searchPublished(tx, { q: `${tag} same`, interest: null, kinds: ['story'], limit: 2, after }))
      hits.push(...found.hits.slice(0, 2))
      after = found.hits.length > 2 ? [found.hits[1]!.score, found.hits[1]!.id, found.hits[1]!.kind] : undefined
    } while (after)

    expect(new Set(hits.map(h => h.id)).size).toBe(6)
  })
})
