import type { ContentSearchQuery, PublicPinRow, PublicReadRepository, PublicStoryRow, PublicTourRow, SearchHit } from '../../../src/modules/content/read-ports.ts'
import { publicSearchListSchema } from '@sk/api-contract'
import { describe, expect, it, vi } from 'vitest'
import { makeSearchPublic } from '../../../src/modules/content/application/search-public.ts'
import { createManualClock } from '../../support/manual-clock.ts'

function uuid(n: number) {
  return `0190a000-0000-7000-8000-${String(n).padStart(12, '0')}`
}

function story(n: number): PublicStoryRow {
  return {
    id: uuid(100 + n),
    stayTag: 'both',
    interests: [],
    categories: [],
    versions: [{ language: 'en', slug: `story-${n}`, published: { title: `Story ${n}`, body: { type: 'doc', content: [] } }, publishedAt: new Date('2090-01-01T00:00:00Z'), mediaKeys: {} }],
  }
}

function pin(n: number, slug: Record<string, string> | null = { en: `pin-${n}` }): PublicPinRow {
  return {
    id: uuid(200 + n),
    slug,
    latitude: 47,
    longitude: 8,
    address: null,
    mapsLink: null,
    weeklyHours: [],
    stayTag: 'both',
    interests: [],
    name: { en: `Pin ${n}` },
    tip: { en: 'Tip' },
    firstPublishedAt: new Date('2090-01-01T00:00:00Z'),
    photoKey: null,
    photoWidth: null,
    mustVisit: false,
    dates: [],
    categories: [],
    parentCategories: [],
    mainStorySlugs: {},
  }
}

function tour(n: number): PublicTourRow {
  return {
    id: uuid(300 + n),
    stopCount: 2,
    slug: { en: `tour-${n}` },
    stayTag: 'both',
    interests: [],
    durationMinutes: 60,
    title: { en: `Tour ${n}` },
    summary: { en: '' },
    meetingPoint: { en: '' },
    sections: [],
    coverKey: null,
    coverWidth: null,
    pdfKey: null,
    keepsakeProductIds: [],
    stops: [],
  }
}

const keepsakeCard = (n: number) => ({ id: uuid(400 + n), slug: `keepsake-${n}`, name: `Keepsake ${n}`, cover: null, soldOut: false, language: 'en' as const, requestedLanguage: 'en' as const, fallback: false, availableLanguages: ['en' as const] })

function hit(kind: SearchHit['kind'], n: number, score: string): SearchHit {
  return { kind, id: uuid({ story: 100, place: 200, tour: 300, keepsake: 400 }[kind] + n), score }
}

function setup(content: SearchHit[], keepsake: SearchHit[], counts = { story: 2, place: 1, tour: 1 }, keepsakeCount = 1, pinOf = (n: number) => pin(n)) {
  const contentAsks: ContentSearchQuery[] = []
  const rowAsks: Record<string, string[]> = {}
  const reads: Pick<PublicReadRepository<null>, 'searchPublished' | 'listPublishedStoriesByIds' | 'listVisiblePinsByIds' | 'listPublishedToursByIds'> = {
    searchPublished: async (_tx, query) => {
      contentAsks.push(query)
      return { hits: content.filter(h => query.kinds.includes(h.kind as 'story')), counts }
    },
    listPublishedStoriesByIds: async (_tx, ids) => {
      rowAsks.story = ids
      return ids.map(id => story(Number(id.slice(-3)) - 100))
    },
    listVisiblePinsByIds: async (_tx, ids) => {
      rowAsks.place = ids
      return ids.map(id => pinOf(Number(id.slice(-3)) - 200))
    },
    listPublishedToursByIds: async (_tx, ids) => {
      rowAsks.tour = ids
      return ids.map(id => tour(Number(id.slice(-3)) - 300))
    },
  }
  const keepsakeHits = vi.fn(async (query: { limit: number }) => ({ hits: query.limit === 0 ? [] : keepsake, count: keepsakeCount }))
  const cards = vi.fn(async (ids: string[]) => ids.map(id => keepsakeCard(Number(id.slice(-3)) - 400)))
  const search = makeSearchPublic({
    uow: { run: work => work(null) },
    reads: reads as PublicReadRepository<null>,
    clock: createManualClock(new Date('2026-11-05T10:00:00Z')),
    publicUrl: key => `https://media.test/${key}`,
    keepsakes: { hits: keepsakeHits, cards },
  })
  return { search, contentAsks, rowAsks, keepsakeHits, cards }
}

describe('[ADR-033][slice 6] the guest search merges the ranked hits of every module', () => {
  it('orders content and keepsake hits together by rank, builds each kind\'s card, and answers the contract', async () => {
    const s = setup([hit('story', 1, '0.9'), hit('place', 1, '0.5'), hit('tour', 1, '0.2')], [hit('keepsake', 1, '0.7')])

    const page = await s.search({ language: 'en', q: 'lion', interest: null, limit: 10 })

    expect(page.items.map(i => i.kind)).toEqual(['story', 'keepsake', 'place', 'tour'])
    expect(page.next).toBeNull()
    expect(page.counts).toEqual({ story: 2, place: 1, tour: 1, keepsake: 1 })
    expect(page.total).toBe(5)
    publicSearchListSchema.parse({ items: page.items, total: page.total, counts: page.counts, nextCursor: null })
  })

  it('equal ranks sort by id, then kind, both descending, so a page boundary never splits a tie differently', async () => {
    const same = [hit('story', 5, '0.5'), hit('tour', 5, '0.5')]
    const s = setup(same, [{ kind: 'keepsake', id: uuid(450), score: '0.5' }])

    const page = await s.search({ language: 'en', q: 'x', interest: null, limit: 10 })

    expect(page.items.map(i => i.card.id)).toEqual([uuid(450), uuid(305), uuid(105)])
  })

  it('cuts at the limit and the cursor key is the last hit kept: rank, id, kind', async () => {
    const s = setup([hit('story', 1, '0.9'), hit('story', 2, '0.8'), hit('tour', 1, '0.7')], [hit('keepsake', 1, '0.85')])

    const page = await s.search({ language: 'en', q: 'x', interest: null, limit: 2 })

    expect(page.items.map(i => i.kind)).toEqual(['story', 'keepsake'])
    expect(page.next).toEqual(['0.85', uuid(401), 'keepsake'])
    // Cards are built for the page only.
    expect(s.rowAsks.tour).toEqual([])
    expect(s.cards).toHaveBeenCalledWith([uuid(401)], 'en')
  })

  it('the cursor reaches both sources, and each is asked for the limit (the repositories read one more)', async () => {
    const s = setup([], [])
    const after = ['0.5', uuid(1), 'story'] as const

    await s.search({ language: 'de', q: 'x', interest: 'food-drink', limit: 7, after })

    expect(s.contentAsks).toEqual([{ q: 'x', interest: 'food-drink', kinds: ['story', 'place', 'tour'], limit: 7, after }])
    expect(s.keepsakeHits).toHaveBeenCalledWith({ q: 'x', interest: 'food-drink', limit: 7, after })
  })

  it('kind=keepsake asks content for no hit but still gets its counts; kind=story asks keepsakes for none', async () => {
    const onlyKeepsakes = setup([], [hit('keepsake', 1, '0.7')])
    const a = await onlyKeepsakes.search({ language: 'en', q: 'x', interest: null, kind: 'keepsake', limit: 10 })
    expect(onlyKeepsakes.contentAsks[0]?.kinds).toEqual([])
    expect(a.items.map(i => i.kind)).toEqual(['keepsake'])
    expect(a.total).toBe(1)
    expect(a.counts).toEqual({ story: 2, place: 1, tour: 1, keepsake: 1 })

    const onlyStories = setup([hit('story', 1, '0.7')], [hit('keepsake', 1, '0.9')])
    const b = await onlyStories.search({ language: 'en', q: 'x', interest: null, kind: 'story', limit: 10 })
    expect(onlyStories.keepsakeHits).toHaveBeenCalledWith(expect.objectContaining({ limit: 0 }))
    expect(onlyStories.contentAsks[0]?.kinds).toEqual(['story'])
    expect(b.items.map(i => i.kind)).toEqual(['story'])
    expect(b.total).toBe(2)
  })

  it('a hit whose place has no slug in its language is left out and the next page still stands', async () => {
    const s = setup([hit('place', 1, '0.9'), hit('story', 1, '0.8'), hit('story', 2, '0.7')], [], { story: 2, place: 1, tour: 0 }, 0, n => pin(n, {}))

    const page = await s.search({ language: 'en', q: 'x', interest: null, limit: 2 })

    expect(page.items.map(i => i.kind)).toEqual(['story'])
    expect(page.next).toEqual(['0.8', uuid(101), 'story'])
  })

  it('no hit at all is an empty page with no cursor', async () => {
    const s = setup([], [], { story: 0, place: 0, tour: 0 }, 0)

    expect(await s.search({ language: 'en', q: 'zzz', interest: null, limit: 10 })).toEqual({ items: [], total: 0, counts: { story: 0, place: 0, tour: 0, keepsake: 0 }, next: null })
  })
})
