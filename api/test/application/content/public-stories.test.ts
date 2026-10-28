import type { StoryDraft } from '@sk/domain/content'
import type { PublicCategoryRow, PublicReadRepository, PublicStoryRow, PublicStoryVersionRow } from '../../../src/modules/content/read-ports.ts'
import { publicCategoryListSchema, publicStoryListSchema, publicStorySchema } from '@sk/api-contract'
import { describe, expect, it } from 'vitest'
import { makeListCategories } from '../../../src/modules/content/application/read-categories.ts'
import { makeGetStory, makeListStories } from '../../../src/modules/content/application/read-stories.ts'
import { createManualClock } from '../../support/manual-clock.ts'

const doc = (title: string, over: Partial<StoryDraft> = {}): StoryDraft => ({ title, excerpt: `${title} excerpt`, intro: '', authorName: '', authorRole: '', readMinutes: 4, coverMediaId: null, sections: [], ...over })

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

  it('[E2.12][AC45] a card carries the blog categories in the language carried, and the cover and image keys', async () => {
    const mediaId = '0190a000-0000-7000-8000-0000000000aa'
    const s = setup([story(id1, [version('en', 'lake-day', 'A day', undefined, {
      published: doc('A day', { coverMediaId: mediaId, sections: [{ id: 's1', heading: 'H', blocks: [{ type: 'image', mediaId, caption: 'c' }, { type: 'audio', mediaId: 'gone', title: 't', caption: '' }, { type: 'paragraph', text: 'p' }] }] }),
      mediaKeys: { [mediaId]: 'store/key-1' },
    })], { categories: [{ id: id2, slug: 'food', name: { en: 'Food', de: 'Essen' }, parentId: null, position: 1 }] })])

    const { items } = await s.list('de')
    const detail = await s.get('lake-day', 'en')

    expect(items[0]!.categories).toEqual([{ id: id2, slug: 'food', name: 'Food' }])
    expect(items[0]!.coverKey).toBe('store/key-1')
    expect(detail.ok && detail.value.sections[0]!.blocks).toEqual([
      { type: 'image', key: 'store/key-1', caption: 'c' },
      { type: 'audio', key: null, title: 't', caption: '' },
      { type: 'paragraph', text: 'p' },
    ])
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

  it('[E2.12][AC45] categories keep the order given and show both names', async () => {
    const s = setup([], [{ id: id1, slug: 'food', name: { en: 'Food', de: 'Essen' }, parentId: null, position: 1 }, { id: id2, slug: 'cafes', name: { en: 'Cafes' }, parentId: id1, position: 1 }])

    const { items } = await s.categories('map')

    expect(items).toEqual([
      { id: id1, slug: 'food', name: { en: 'Food', de: 'Essen' }, parentId: null, position: 1 },
      { id: id2, slug: 'cafes', name: { en: 'Cafes', de: 'Cafes' }, parentId: id1, position: 1 },
    ])
  })
})
