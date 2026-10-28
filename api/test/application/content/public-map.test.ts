import type { PinDate } from '@sk/domain/content'
import type { PublicCategoryRow, PublicPinRow, PublicReadRepository, PublicTourRow } from '../../../src/modules/content/read-ports.ts'
import { publicMapItemSchema, publicMapSchema, publicPinSchema, publicTourListSchema, publicTourSchema } from '@sk/api-contract'
import { describe, expect, it } from 'vitest'
import { makeGetMap } from '../../../src/modules/content/application/read-map.ts'
import { makeGetPin } from '../../../src/modules/content/application/read-pins.ts'
import { makeGetTour, makeListTours } from '../../../src/modules/content/application/read-tours.ts'
import { createManualClock } from '../../support/manual-clock.ts'

const uuid = (n: number) => `0190a000-0000-7000-8000-${String(n).padStart(12, '0')}`

function date(over: Partial<PinDate>): PinDate {
  return { id: 'd', firstDay: '2090-11-14', lastDay: '2090-11-14', startTime: null, endTime: null, ...over }
}

function cat(n: number, over: Partial<PublicCategoryRow> = {}): PublicCategoryRow {
  return { id: uuid(900 + n), slug: `cat-${n}`, name: { en: `Cat ${n}`, de: `Kat ${n}` }, parentId: null, position: n, ...over }
}

function pin(n: number, over: Partial<PublicPinRow> = {}): PublicPinRow {
  return {
    id: uuid(n),
    slug: { en: `pin-${n}`, de: `ort-${n}` },
    latitude: 47.05,
    longitude: 8.3,
    address: null,
    weeklyHours: [],
    stayTag: 'both',
    interests: [],
    name: { en: `Pin ${n}`, de: `Ort ${n}` },
    tip: { en: 'Tip', de: 'Tipp' },
    firstPublishedAt: new Date('2090-01-01T00:00:00Z'),
    photoKey: null,
    dates: [],
    categories: [],
    parentCategories: [],
    mainStorySlugs: {},
    ...over,
  }
}

function tour(n: number, over: Partial<PublicTourRow> = {}): PublicTourRow {
  return {
    id: uuid(500 + n),
    slug: { en: `tour-${n}` },
    stayTag: 'both',
    interests: [],
    durationMinutes: 90,
    title: { en: `Tour ${n}` },
    summary: { en: 'Summary' },
    meetingPoint: { en: 'Station' },
    sections: [{ id: 's1', heading: { en: 'Heading' }, body: { en: 'Body' } }],
    coverKey: 'cover/key',
    pdfKey: 'pdf/key',
    keepsakeProductIds: [],
    stops: [{ position: 1, latitude: 47, longitude: 8, title: { en: 'Stop' }, text: { en: 'Text' }, minutesFromStart: 0, key: null, placeId: null }],
    ...over,
  }
}

function setup(state: { pins: PublicPinRow[], tours?: PublicTourRow[] }, start = '2090-11-10T12:00:00Z') {
  let loads = 0
  const tours = () => state.tours ?? []
  const reads: PublicReadRepository<null> = {
    listPublishedStories: async () => [],
    findPublishedStoryBySlug: async () => undefined,
    listCategories: async () => [],
    listVisiblePins: async () => {
      loads += 1
      return state.pins
    },
    findVisiblePin: async (_tx, id) => state.pins.find(p => p.id === id),
    listPublishedTours: async () => tours(),
    findPublishedTourBySlug: async (_tx, slug) => tours().find(t => Object.values(t.slug).includes(slug)),
  }
  const clock = createManualClock(new Date(start))
  const deps = { uow: { run: <R>(work: (tx: null) => Promise<R>) => work(null) }, reads, clock }
  const getMap = makeGetMap(deps)
  const getPin = makeGetPin(deps)
  const listTours = makeListTours(deps)
  const getTour = makeGetTour(deps)
  return {
    clock,
    loads: () => loads,
    map: async (lang: 'en' | 'de') => publicMapSchema.parse(await getMap(lang)),
    pin: async (id: string, lang: 'en' | 'de') => {
      const result = await getPin(id, lang)
      if (result.ok)
        publicPinSchema.parse(result.value)
      return result
    },
    tours: async (lang: 'en' | 'de') => publicTourListSchema.parse(await listTours(lang)),
    tour: async (slug: string, lang: 'en' | 'de') => {
      const result = await getTour(slug, lang)
      if (result.ok)
        publicTourSchema.parse(result.value)
      return result
    },
  }
}

describe('public map list', () => {
  it('[E2.12][AC86] the five end-rule rows, through the list', async () => {
    const evening = pin(1, { dates: [date({ id: 'e', startTime: '19:30', endTime: '21:00' })] })
    const noEnd = pin(2, { dates: [date({})] })
    const undated = pin(3)
    const s = setup({ pins: [evening, noEnd, undated] }, '2090-11-10T12:00:00Z')

    const early = await s.map('en')
    expect(early.items.map(i => i.id).sort()).toEqual([evening.id, noEnd.id, undated.id].sort())
    expect(early.items.find(i => i.id === evening.id)?.nextDate).toEqual({ firstDay: '2090-11-14', lastDay: '2090-11-14', startTime: '19:30', endTime: '21:00' })
    expect(early.items.find(i => i.id === undated.id)?.nextDate).toBeNull()

    // 21:01 Zurich (CET), the evening is over; the pin without an end time runs until 24:00.
    s.clock.advance(new Date('2090-11-14T20:01:00Z').getTime() - s.clock.now().getTime())
    const late = await s.map('en')
    expect(late.items.map(i => i.id).sort()).toEqual([noEnd.id, undated.id].sort())

    // 23:59 Zurich, still listed; 00:00 Zurich the next day, gone.
    const s2 = setup({ pins: [noEnd] }, '2090-11-14T22:59:00Z')
    expect((await s2.map('en')).items.map(i => i.id)).toEqual([noEnd.id])
    const s3 = setup({ pins: [noEnd] }, '2090-11-14T23:00:00Z')
    expect((await s3.map('en')).items).toEqual([])
  })

  it('[E2.12][AC86] a pin with one past and one future date lists the future date', async () => {
    const mixed = pin(1, { dates: [date({ id: 'p', firstDay: '2090-11-01', lastDay: '2090-11-01' }), date({ id: 'f', firstDay: '2090-12-01', lastDay: '2090-12-01' })] })
    const s = setup({ pins: [mixed] }, '2090-11-10T12:00:00Z')

    const { items } = await s.map('en')

    expect(items[0]?.nextDate).toEqual({ firstDay: '2090-12-01', lastDay: '2090-12-01', startTime: null, endTime: null })
  })

  it('[E2.12][AC88] items carry exactly the map fields, with parents, both categories, or none', async () => {
    const parent = cat(1)
    const child = cat(2, { parentId: parent.id })
    const other = cat(3)
    const sub = pin(1, { categories: [child], parentCategories: [parent] })
    const two = pin(2, { categories: [other, parent], parentCategories: [] })
    const none = pin(3)
    const s = setup({ pins: [sub, two, none] })

    const { items } = await s.map('en')
    const byId = (p: PublicPinRow) => items.find(i => i.id === p.id)!

    expect(byId(sub).categoryIds.sort()).toEqual([child.id, parent.id].sort())
    expect(byId(two).categoryIds.sort()).toEqual([other.id, parent.id].sort())
    expect(byId(none).categoryIds).toEqual([])
    expect(Object.keys(byId(sub)).sort()).toEqual(Object.keys(publicMapItemSchema.shape).sort())
  })

  it('[E2.12][AC88][D-5] a pin that falls back to English keeps the English main story slug, not the reader\'s language', async () => {
    const s = setup({ pins: [pin(1, { name: { en: 'Only EN' }, tip: { en: 'Tip EN' }, mainStorySlugs: { en: 'story-en', de: 'geschichte' } })] })

    const item = (await s.map('de')).items[0]!
    const detail = await s.pin(uuid(1), 'de')

    expect(item).toMatchObject({ language: 'en', hasMainStory: true, mainStorySlug: 'story-en' })
    expect(detail.ok && detail.value).toMatchObject({ language: 'en', fallback: true, hasMainStory: true, mainStorySlug: 'story-en' })
  })

  it('[E2.12][AC88] hasMainStory and mainStorySlug follow the main story versions in the carried language', async () => {
    const withBoth = pin(1, { mainStorySlugs: { en: 'story-en', de: 'geschichte' } })
    const enOnly = pin(2, { mainStorySlugs: { en: 'story-en-2' }, name: { en: 'Pin 2', de: 'Ort 2' } })
    const none = pin(3)
    const s = setup({ pins: [withBoth, enOnly, none] })

    const de = (await s.map('de')).items
    const get = (p: PublicPinRow) => de.find(i => i.id === p.id)!

    expect(get(withBoth)).toMatchObject({ hasMainStory: true, mainStorySlug: 'geschichte', language: 'de', title: 'Ort 1' })
    expect(get(enOnly)).toMatchObject({ hasMainStory: true, mainStorySlug: null, language: 'de' })
    expect(get(none)).toMatchObject({ hasMainStory: false, mainStorySlug: null })
  })

  it('[E2.12][AC64] a pin with English only, read as de, carries English', async () => {
    const s = setup({ pins: [pin(1, { name: { en: 'Only EN' }, slug: { en: 'only-en' } })] })

    expect((await s.map('de')).items[0]).toMatchObject({ title: 'Only EN', slug: 'only-en', language: 'en' })
  })

  it('[E2.12][AC45] the default order is newest first, the id breaking a tie', async () => {
    const older = pin(1, { firstPublishedAt: new Date('2090-01-01T00:00:00Z') })
    const newer = pin(2, { firstPublishedAt: new Date('2090-02-01T00:00:00Z') })
    const tieLow = pin(3, { firstPublishedAt: new Date('2090-01-01T00:00:00Z') })
    const s = setup({ pins: [older, newer, tieLow] })

    expect((await s.map('en')).items.map(i => i.id)).toEqual([newer.id, tieLow.id, older.id])
  })

  it('[E2.12][AC45] a pin published at t0+10 s shows at t0+61 s and not at t0+59 s, on the same instance', async () => {
    const state = { pins: [pin(1)] }
    const s = setup(state)
    expect((await s.map('en')).items).toHaveLength(1)

    s.clock.advance(10_000)
    state.pins = [...state.pins, pin(2)]
    s.clock.advance(49_000)
    expect((await s.map('en')).items).toHaveLength(1)
    s.clock.advance(2_000)
    expect((await s.map('en')).items).toHaveLength(2)
  })

  it('[E2.12][AC45] the cache is kept per language', async () => {
    const s = setup({ pins: [pin(1)] })

    await s.map('en')
    await s.map('en')
    await s.map('de')

    expect(s.loads()).toBe(2)
  })
})

describe('public pin card', () => {
  it('[E2.12][AC88] carries the card fields, categories with their parent, and the next date', async () => {
    const parent = cat(1)
    const child = cat(2, { parentId: parent.id })
    const p = pin(1, { categories: [child], parentCategories: [parent], dates: [date({})], address: 'Kapellbruecke', mainStorySlugs: { en: 'story-en' }, photoKey: 'k/1' })
    const s = setup({ pins: [p] })

    const result = await s.pin(p.id, 'en')

    expect(result.ok && result.value).toMatchObject({
      id: p.id,
      title: 'Pin 1',
      tip: 'Tip',
      address: 'Kapellbruecke',
      language: 'en',
      fallback: false,
      availableLanguages: ['de', 'en'],
      hasMainStory: true,
      mainStorySlug: 'story-en',
      photoKey: 'k/1',
      nextDate: { firstDay: '2090-11-14', lastDay: '2090-11-14', startTime: null, endTime: null },
      categories: [{ id: parent.id, slug: 'cat-1', name: 'Cat 1' }, { id: child.id, slug: 'cat-2', name: 'Cat 2' }],
    })
  })

  it('[E2.12][AC88] a category with an English name only reads as null in German on the pin card', async () => {
    const enOnly = cat(1, { name: { en: 'Cafes' } })
    const p = pin(1, { categories: [enOnly] })
    const s = setup({ pins: [p] })

    const card = await s.pin(p.id, 'de')

    expect(card.ok && card.value.categories).toEqual([{ id: enOnly.id, slug: 'cat-1', name: null }])
  })

  it('[E2.12][AC64] English only, read as de, carries English and says so', async () => {
    const s = setup({ pins: [pin(1, { name: { en: 'Only EN' }, tip: { en: 'Tip EN' } })] })

    const result = await s.pin(uuid(1), 'de')

    expect(result.ok && result.value).toMatchObject({ title: 'Only EN', tip: 'Tip EN', language: 'en', requestedLanguage: 'de', fallback: true, availableLanguages: ['en'] })
  })

  it('[E2.12][AC64] a tip missing in the carried language is empty, not the other language', async () => {
    const s = setup({ pins: [pin(1, { tip: { en: 'Tip EN' } })] })

    const result = await s.pin(uuid(1), 'de')

    expect(result.ok && result.value).toMatchObject({ title: 'Ort 1', tip: '', language: 'de' })
  })

  it('[E2.12][AC45] an unknown id, and a pin whose dates have all ended, are 404', async () => {
    const ended = pin(1, { dates: [date({})] })
    const s = setup({ pins: [ended] }, '2090-11-15T12:00:00Z')

    expect(await s.pin(uuid(2), 'en')).toEqual({ ok: false, reason: 'not-found' })
    expect(await s.pin(ended.id, 'en')).toEqual({ ok: false, reason: 'not-found' })
  })
})

describe('public tour guides', () => {
  it('[E2.12][AC64] a guide with English only, read as de, carries English', async () => {
    const s = setup({ pins: [], tours: [tour(1)] })

    const list = await s.tours('de')
    const detail = await s.tour('tour-1', 'de')

    expect(list.items[0]).toMatchObject({ title: 'Tour 1', slug: 'tour-1', language: 'en', requestedLanguage: 'de', fallback: true, availableLanguages: ['en'] })
    expect(detail.ok && detail.value).toMatchObject({ summary: 'Summary', meetingPoint: 'Station', pdfKey: 'pdf/key', stops: [{ position: 1, title: 'Stop', text: 'Text' }] })
  })

  it('[E2.12][AC64] the detail found by the slug of the other language carries the asked one', async () => {
    const both = tour(1, { slug: { en: 'old-town', de: 'altstadt' }, title: { en: 'Old town', de: 'Altstadt' }, summary: { en: 'S', de: 'Z' } })
    const s = setup({ pins: [], tours: [both] })

    const detail = await s.tour('old-town', 'de')

    expect(detail.ok && detail.value).toMatchObject({ slug: 'altstadt', title: 'Altstadt', summary: 'Z', language: 'de', fallback: false })
  })

  it('[E2.12][AC64] a section or stop missing in the carried language is empty, not the other language', async () => {
    const both = tour(1, {
      slug: { en: 'old-town', de: 'altstadt' },
      title: { en: 'Old town', de: 'Altstadt' },
      summary: { en: 'S', de: 'Z' },
      sections: [{ id: 's1', heading: { en: 'Heading' }, body: { en: 'Body' } }],
      stops: [{ position: 1, latitude: 47, longitude: 8, title: { en: 'Stop' }, text: { en: 'Text' }, minutesFromStart: null, key: null, placeId: null }],
    })
    const s = setup({ pins: [], tours: [both] })

    const detail = await s.tour('old-town', 'de')

    expect(detail.ok && detail.value).toMatchObject({ sections: [{ id: 's1', heading: '', body: '' }], stops: [{ title: '', text: '' }] })
  })

  it('[E2.12][AC64] an unknown slug is a 404', async () => {
    const s = setup({ pins: [], tours: [tour(1)] })

    expect(await s.tour('nope', 'en')).toEqual({ ok: false, reason: 'not-found' })
  })
})
