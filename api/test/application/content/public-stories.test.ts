import type { PublicCategoryRow, PublicReadRepository, PublicStoryRow, PublicStoryVersionRow, StoredStoryDoc } from '../../../src/modules/content/read-ports.ts'
import { publicCategoryListSchema, publicStoryListSchema, publicStorySchema } from '@sk/api-contract'
import { describe, expect, it } from 'vitest'
import { makeListCategories } from '../../../src/modules/content/application/read-categories.ts'
import { makeGetStory, makeListStories } from '../../../src/modules/content/application/read-stories.ts'
import { createManualClock } from '../../support/manual-clock.ts'

const doc = (title: string, over: Partial<StoredStoryDoc> = {}): StoredStoryDoc => ({ title, excerpt: `${title} excerpt`, authorName: '', authorRole: '', coverMediaId: null, body: { type: 'doc', content: [] }, ...over })

function version(language: 'en' | 'de', slug: string, title: string, publishedAt = '2090-01-01T00:00:00Z', over: Partial<PublicStoryVersionRow> = {}): PublicStoryVersionRow {
  return { language, slug, published: doc(title), publishedAt: new Date(publishedAt), mediaKeys: {}, ...over }
}

function story(id: string, versions: PublicStoryVersionRow[], over: Partial<PublicStoryRow> = {}): PublicStoryRow {
  return { id, stayTag: 'both', interests: [], categories: [], versions, ...over }
}

function setup(stories: PublicStoryRow[], categories: PublicCategoryRow[] = []) {
  const reads: PublicReadRepository<null> = {
    listPublishedStories: async () => stories,
    findPublishedStoryBySlug: async (_tx, slug) => stories.find(s => s.versions.some(v => v.slug === slug)),
    listCategories: async () => categories,
    listVisiblePins: async () => [],
    findVisiblePin: async () => undefined,
    listPublishedTours: async () => [],
    findPublishedTourBySlug: async () => undefined,
  }
  const deps = { uow: { run: <R>(work: (tx: null) => Promise<R>) => work(null) }, reads, clock: createManualClock(new Date('2026-10-27T10:00:00Z')) }
  const listStories = makeListStories(deps)
  const getStory = makeGetStory(deps)
  const listCategories = makeListCategories(deps)
  // Every output must satisfy the public contract schemas (the application layer cannot import them).
  return {
    list: async (...args: Parameters<typeof listStories>) => publicStoryListSchema.parse(await listStories(...args)),
    get: async (...args: Parameters<typeof getStory>) => {
      const result = await getStory(...args)
      if (result.ok)
        publicStorySchema.parse(result.value)
      return result
    },
    categories: async (...args: Parameters<typeof listCategories>) => publicCategoryListSchema.parse(await listCategories(...args)),
  }
}

const id1 = '0190a000-0000-7000-8000-000000000001'
const id2 = '0190a000-0000-7000-8000-000000000002'

describe('public stories', () => {
  it('[E2.12][AC64] a story with English only, read as de, carries the English text and says so', async () => {
    const s = setup([story(id1, [version('en', 'lake-day', 'A day on the lake')])])

    const { items } = await s.list('de')

    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ id: id1, slug: 'lake-day', title: 'A day on the lake', language: 'en', requestedLanguage: 'de', fallback: true, availableLanguages: ['en'] })
  })

  it('[E2.12][AC64] a story with both languages reads in the language asked for', async () => {
    const s = setup([story(id1, [version('en', 'lake-day', 'A day on the lake'), version('de', 'seetag', 'Ein Tag am See')])])

    const { items } = await s.list('de')

    expect(items[0]).toMatchObject({ slug: 'seetag', title: 'Ein Tag am See', language: 'de', fallback: false, availableLanguages: ['de', 'en'] })
  })

  it('[E2.12][AC64] a story with no published version is absent and its detail is a 404', async () => {
    const s = setup([story(id1, [])])

    expect((await s.list('en')).items).toEqual([])
    expect(await s.get('anything', 'en')).toEqual({ ok: false, reason: 'not-found' })
  })

  it('[E2.12][AC64] the detail found by the slug of the other language carries the asked language when it exists', async () => {
    const s = setup([story(id1, [version('en', 'lake-day', 'A day on the lake'), version('de', 'seetag', 'Ein Tag am See')])])

    const result = await s.get('lake-day', 'de')

    expect(result.ok && result.value).toMatchObject({ slug: 'seetag', language: 'de', fallback: false })
  })

  it('[E2.12][AC64] the detail falls back to the only language there is', async () => {
    const s = setup([story(id1, [version('en', 'lake-day', 'A day on the lake')])])

    const result = await s.get('lake-day', 'de')

    expect(result.ok && result.value).toMatchObject({ language: 'en', requestedLanguage: 'de', fallback: true })
  })

  it('[E2.12][AC45] [E2.13][AC54] a card carries the blog categories, the cover key and a reading time; the detail carries the body with image keys', async () => {
    const mediaId = '0190a000-0000-7000-8000-0000000000aa'
    const body = { type: 'doc', content: [
      { type: 'image', attrs: { mediaId, alt: 'a lake', caption: 'c' } },
      { type: 'audio', attrs: { mediaId: 'gone', title: 't', caption: '' } },
      { type: 'paragraph', content: [{ type: 'text', text: 'p' }] },
    ] }
    const s = setup([story(id1, [version('en', 'lake-day', 'A day', undefined, {
      published: doc('A day', { coverMediaId: mediaId, body }),
      mediaKeys: { [mediaId]: 'store/key-1' },
    })], { categories: [{ id: id2, slug: 'food', name: { en: 'Food', de: 'Essen' }, parentId: null, position: 1 }] })])

    const { items } = await s.list('de')
    const detail = await s.get('lake-day', 'en')

    expect(items[0]!.categories).toEqual([{ id: id2, slug: 'food', name: 'Food' }])
    expect(items[0]!.coverKey).toBe('store/key-1')
    expect(items[0]!.excerpt).toBe('A day excerpt')
    expect(items[0]!.readMinutes).toBeGreaterThanOrEqual(1)
    expect(detail.ok && detail.value.body).toEqual({ type: 'doc', content: [
      { type: 'image', attrs: { key: 'store/key-1', alt: 'a lake', caption: 'c' } },
      { type: 'audio', attrs: { key: null, title: 't', caption: '' } },
      { type: 'paragraph', content: [{ type: 'text', text: 'p' }] },
    ] })
    expect(detail.ok && 'intro' in detail.value).toBe(false)
    expect(detail.ok && 'sections' in detail.value).toBe(false)
  })

  it('[E2.12][AC45] a category with an English name only reads as null in German on a card and on the detail', async () => {
    const s = setup([story(id1, [version('en', 'lake-day', 'A day'), version('de', 'seetag', 'Ein Tag')], { categories: [{ id: id2, slug: 'cafes', name: { en: 'Cafes' }, parentId: null, position: 1 }] })])

    const card = (await s.list('de')).items[0]!
    const detail = await s.get('seetag', 'de')

    expect(card.language).toBe('de')
    expect(card.categories).toEqual([{ id: id2, slug: 'cafes', name: null }])
    expect(detail.ok && detail.value.categories).toEqual([{ id: id2, slug: 'cafes', name: null }])
  })

  it('[E2.12][AC45] stories come newest first by the date of the version carried, as ISO text', async () => {
    const s = setup([
      story(id1, [version('en', 'old', 'Old', '2090-01-01T00:00:00Z')]),
      story(id2, [version('en', 'new', 'New', '2090-02-01T00:00:00Z')]),
    ])

    const { items } = await s.list('en')

    expect(items.map(i => i.slug)).toEqual(['new', 'old'])
    expect(items[0]!.publishedAt).toBe('2090-02-01T00:00:00.000Z')
  })

  it('[E2.12][AC45] categories keep the order given and show the names that exist, with no fill', async () => {
    const s = setup([], [{ id: id1, slug: 'food', name: { en: 'Food', de: 'Essen' }, parentId: null, position: 1 }, { id: id2, slug: 'cafes', name: { en: 'Cafes' }, parentId: id1, position: 1 }])

    const { items } = await s.categories('map')

    expect(items).toEqual([
      { id: id1, slug: 'food', name: { en: 'Food', de: 'Essen' }, parentId: null, position: 1 },
      { id: id2, slug: 'cafes', name: { en: 'Cafes', de: null }, parentId: id1, position: 1 },
    ])
  })

  it('[E2.13][AC54] the reading time comes from the words of the body, 200 a minute, at least 1', async () => {
    const words = (n: number) => ({ type: 'paragraph', content: [{ type: 'text', text: Array.from<string>({ length: n }).fill('w').join(' ') }] })
    const s = setup([
      story(id1, [version('en', 'short', 'Short', undefined, { published: doc('Short', { body: { type: 'doc', content: [] } }) })]),
      story(id2, [version('en', 'long', 'Long', '2090-02-01T00:00:00Z', { published: doc('Long', { body: { type: 'doc', content: [words(401)] } }) })]),
    ])

    const { items } = await s.list('en')

    expect(items.map(i => [i.slug, i.readMinutes])).toEqual([['long', 3], ['short', 1]])
  })

  it('[E2.13][AC54] a body that is not stored as a document gives an empty document, not an error', async () => {
    const bodies: unknown[] = [undefined, null, 'text', 42, [], { type: 'paragraph' }, { type: 'doc' }, { type: 'doc', content: 'nope' }]
    for (const body of bodies) {
      const s = setup([story(id1, [version('en', 'odd', 'Odd', undefined, { published: doc('Odd', { body }) })])])
      const detail = await s.get('odd', 'en')
      expect(detail.ok && detail.value.body).toEqual({ type: 'doc', content: [] })
      expect((await s.list('en')).items[0]!.readMinutes).toBe(1)
    }
  })

  it('[E2.13][AC54] an odd stored body never throws: unknown nodes and marks are dropped, bad ids give no key, hrefs stay safe', async () => {
    const pin = '0190a000-0000-7000-8000-0000000000bb'
    const body = { type: 'doc', content: [
      { type: 'iframe', attrs: { src: 'https://evil.example' } },
      null,
      42,
      { type: 'image', attrs: { caption: 'no id' } },
      { type: 'audio', attrs: { mediaId: 42, title: 't', extra: 'x' } },
      { type: 'video', attrs: { youtubeId: 'dQw4w9WgXcQ', title: 'v', caption: '', onload: 'x' } },
      { type: 'video', attrs: { youtubeId: 'not valid!', title: 'v', caption: '' } },
      { type: 'heading', attrs: { level: 5 }, content: [{ type: 'text', text: 'H' }] },
      { type: 'paragraph', attrs: { style: 'x' }, content: [
        { type: 'text', text: 'a', marks: [{ type: 'bold' }, { type: 'underline' }, { type: 'link', attrs: { href: 'javascript:alert(1)' } }, { type: 'link', attrs: { href: 'https://example.com', target: '_blank' } }, { type: 'pinLink', attrs: { pinId: pin } }, { type: 'pinLink', attrs: { pinId: 'nope' } }] },
        { type: 'text', text: 7 },
        { type: 'image', attrs: {} },
        { type: 'hardBreak' },
      ] },
      { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph' }, { type: 'orderedList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'deep' }] }] }] }] }, { type: 'paragraph' }] },
    ] }
    const s = setup([story(id1, [version('en', 'odd', 'Odd', undefined, { published: doc('Odd', { body }) })])])

    const detail = await s.get('odd', 'en')

    expect(detail.ok && detail.value.body.content).toEqual([
      { type: 'image', attrs: { key: null, alt: '', caption: 'no id' } },
      { type: 'audio', attrs: { key: null, title: 't', caption: '' } },
      { type: 'video', attrs: { youtubeId: 'dQw4w9WgXcQ', title: 'v', caption: '' } },
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'H' }] },
      { type: 'paragraph', content: [
        { type: 'text', text: 'a', marks: [{ type: 'bold' }, { type: 'link', attrs: { href: 'https://example.com' } }, { type: 'pinLink', attrs: { pinId: pin } }] },
        { type: 'hardBreak' },
      ] },
      { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph' }, { type: 'orderedList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'deep' }] }] }] }] }] },
    ])
  })

  it('[E2.13][AC54] a body nested far deeper than the limit is cut, not walked to the bottom', async () => {
    let node: Record<string, unknown> = { type: 'paragraph', content: [{ type: 'text', text: 'bottom' }] }
    for (let i = 0; i < 5000; i++)
      node = { type: i % 2 === 0 ? 'listItem' : 'bulletList', content: [node] }
    const s = setup([story(id1, [version('en', 'deep', 'Deep', undefined, { published: doc('Deep', { body: { type: 'doc', content: [node] } }) })])])

    const detail = await s.get('deep', 'en')

    expect(detail.ok).toBe(true)
  })

  it('[E2.13][AC30] script text comes back as a text node unchanged, and the response has no intro', async () => {
    const script = '<script>alert(1)</script>'
    const s = setup([story(id1, [version('en', 'xss', 'Xss', undefined, { published: doc('Xss', { body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: script }] }] } }) })])])

    const detail = await s.get('xss', 'en')

    expect(detail.ok && detail.value.body.content).toEqual([{ type: 'paragraph', content: [{ type: 'text', text: script }] }])
    expect(JSON.stringify(detail.ok && detail.value)).not.toContain('"intro"')
  })

  it('[E2.13][AC54] no key of a story card or detail is named or shaped as a price', async () => {
    const s = setup([story(id1, [version('en', 'lake-day', 'A day')])])

    const detail = await s.get('lake-day', 'en')
    const keys: string[] = []
    JSON.parse(JSON.stringify(detail.ok && detail.value), function (key) {
      keys.push(key)
      return this[key]
    })

    expect(keys.filter(k => /price|amount|chf|currency|cost/i.test(k))).toEqual([])
  })
})
