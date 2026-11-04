import type { SearchSources } from '@/features/search/lib/search'
import { describe, expect, it } from 'vitest'
import { fold, foldDigraphs } from '@/features/search/lib/fold'
import { interestResults, kindFilter, scoreTitle, searchAll, suggestNames } from '@/features/search/lib/search'
import { keepsakeCard, mapItem, tourCard } from './support/search-fixtures'
import { storyCard } from './support/story-cards'

const none: SearchSources = { stories: [], pins: [], tours: [], keepsakes: [] }
const titles = (s: SearchSources, q: string) => searchAll(s, q).map(r => r.title)

describe('[E4.14][AC54][AC90][AC94] fold: accents, case and sharp s are ignored', () => {
  it.each([
    ['Löwendenkmal', 'lowendenkmal'],
    ['Café Heini', 'cafe heini'],
    ['STRASSE', 'strasse'],
    ['Straße', 'strasse'],
    ['Zürich Ärzte', 'zurich arzte'],
  ])('%s folds to %s', (input, out) => {
    expect(fold(input)).toBe(out)
  })

  it('ac-1 "lowen" finds the place Löwendenkmal and "CAFE" finds the story Café Heini', () => {
    const s = { ...none, pins: [mapItem({ title: 'Löwendenkmal' })], stories: [storyCard({ title: 'Café Heini' })] }

    expect(searchAll(s, 'lowen').map(r => [r.kind, r.title])).toEqual([['place', 'Löwendenkmal']])
    expect(searchAll(s, 'CAFE').map(r => [r.kind, r.title])).toEqual([['story', 'Café Heini']])
  })

  it('ac-1 digraphs: "Loewendenkmal", "Kaefer" and "Mueller" find Löwendenkmal, Käfer and Müller, and "blue" still matches Blue', () => {
    const s = { ...none, pins: [mapItem({ title: 'Löwendenkmal' }), mapItem({ title: 'Käfer' }), mapItem({ title: 'Müller' }), mapItem({ title: 'Blue lake' })] }

    expect(titles(s, 'Loewendenkmal')).toEqual(['Löwendenkmal'])
    expect(titles(s, 'kaefer')).toEqual(['Käfer'])
    expect(titles(s, 'MUELLER')).toEqual(['Müller'])
    expect(titles(s, 'blue')).toEqual(['Blue lake'])
    expect(foldDigraphs('Löwen Ärzte Über Straße')).toBe('loewen aerzte ueber strasse')
  })

  it('an empty or blank query finds nothing', () => {
    const s = { ...none, pins: [mapItem({ title: 'Löwendenkmal' })] }

    expect(searchAll(s, '')).toEqual([])
    expect(searchAll(s, '   ')).toEqual([])
  })
})

describe('[E4.14][AC54][AC90][AC94] searchAll: one list, each row names its kind and its address', () => {
  const s: SearchSources = {
    stories: [storyCard({ title: 'Lucerne in a day', slug: 'lucerne-in-a-day', language: 'de', cover: { url: 'https://x/s.jpg', variants: [{ width: 320, url: 'https://x/s-320.webp' }] } })],
    pins: [mapItem({ title: 'Lucerne station', slug: 'bahnhof', photoUrl: 'https://x/p.webp' })],
    tours: [tourCard({ title: 'Lucerne highlights', slug: 'highlights', coverKey: 'lucerne-old-town' })],
    keepsakes: [keepsakeCard({ name: 'Lucerne knife', slug: 'knife', language: 'de' })],
  }

  it('ac-2 four results: Story, Place, Tour, Keepsake with the map card, story, tour and keepsake addresses', () => {
    const rows = searchAll(s, 'lucerne')

    expect(rows.map(r => [r.kind, r.link])).toEqual([
      ['story', { to: '/$lang/stories/$slug', params: { lang: 'de', slug: 'lucerne-in-a-day' } }],
      ['place', { to: '/$lang/map', params: { lang: 'en' }, search: { place: 'bahnhof' } }],
      ['tour', { to: '/$lang/tours/$slug', params: { lang: 'en', slug: 'highlights' } }],
      ['keepsake', { to: '/$lang/gifts/$slug', params: { lang: 'de', slug: 'knife' } }],
    ])
  })

  it('carries the photo: the smallest story cover copy, the pin photo, the tour key, the keepsake cover', () => {
    const rows = searchAll(s, 'lucerne')

    expect(rows.map(r => [r.photoUrl, r.photoKey])).toEqual([
      ['https://x/s-320.webp', null],
      ['https://x/p.webp', null],
      [null, 'lucerne-old-town'],
      [null, null],
    ])
  })

  it('a place without a slug in the language is left out', () => {
    expect(searchAll({ ...none, pins: [mapItem({ title: 'Lucerne hidden', slug: null })] }, 'lucerne')).toEqual([])
  })
})

describe('[E4.14][AC54][AC90][AC94] scoreTitle: equal 4, whole-word prefix 3, prefix 2, word-start 1, inner 0, none -1', () => {
  it.each([
    ['Lake', 'lake', 4],
    ['LÄKE', 'lake', 4],
    ['Lake cruise', 'lake', 3],
    ['Lake-side walk', 'lake', 3],
    ['Lakeside', 'lake', 2],
    ['Old town lake walk', 'lake', 1],
    ['Old town lakeside', 'lake', 1],
    ['Blake', 'lake', 0],
    ['Blake lake', 'lake', 1],
    ['Löwendenkmal', 'loewen', 2],
    ['Löwendenkmal', 'lowen', 2],
    ['Castle', 'lake', -1],
  ])('%s for "%s" scores %i', (title, q, score) => {
    expect(scoreTitle(title, q)).toBe(score)
  })

  it('ac-3 "lake": whole-word prefix "Lake cruise" first, then prefix "Lakeside", then word-start "Old town lake walk"', () => {
    const s = { ...none, stories: [
      storyCard({ title: 'Old town lake walk' }),
      storyCard({ title: 'Lakeside' }),
      storyCard({ title: 'Lake cruise' }),
    ] }

    expect(titles(s, 'lake')).toEqual(['Lake cruise', 'Lakeside', 'Old town lake walk'])
  })

  it('an equal title beats a whole-word prefix, which beats a later word-start, which beats an inner match', () => {
    const s = { ...none, stories: [storyCard({ title: 'Blake' }), storyCard({ title: 'Blake lake' }), storyCard({ title: 'Lake cruise' }), storyCard({ title: 'Lake' })] }

    expect(titles(s, 'lake')).toEqual(['Lake', 'Lake cruise', 'Blake lake', 'Blake'])
  })

  it('equal scores keep the source order (stories, places, tours, keepsakes) and then the server order', () => {
    const s: SearchSources = {
      stories: [storyCard({ title: 'Rigi one' }), storyCard({ title: 'Rigi two' })],
      pins: [mapItem({ title: 'Rigi pin' })],
      tours: [tourCard({ title: 'Rigi tour' })],
      keepsakes: [keepsakeCard({ name: 'Rigi mug' })],
    }

    expect(titles(s, 'rigi')).toEqual(['Rigi one', 'Rigi two', 'Rigi pin', 'Rigi tour', 'Rigi mug'])
  })
})

// Hidden rows are not the matcher's business: the public reads leave them out, and the API integration tests cover that
// (api/test/integration/content-pin-dates.test.ts: an ended, a draft and a hidden pin are never listed;
// catalog-public-keepsakes.test.ts: an unpublished and an archived keepsake are not listed).
describe('[E4.14][AC54][AC90][AC94] a result row carries no price', () => {
  it('ac-4 a keepsake that came with a price still gives a row with the seven search fields and no price', () => {
    const rows = searchAll({ ...none, keepsakes: [{ ...keepsakeCard({ name: 'Paid knife' }), priceRappen: 2500, currency: 'CHF', price: 25 } as never] }, 'knife')

    expect(rows).toHaveLength(1)
    expect(Object.keys(rows[0]!).sort()).toEqual(['interests', 'key', 'kind', 'link', 'photoKey', 'photoUrl', 'title'])
    expect(JSON.stringify(rows)).not.toMatch(/price|rappen|CHF|currency/i)
  })
})

describe('[E4.14][AC54][AC90][AC94] kindFilter: only when more than one kind is present', () => {
  it('ac-5 results of one kind give no kind filter', () => {
    expect(kindFilter(searchAll({ ...none, stories: [storyCard({ title: 'A' }), storyCard({ title: 'AB' })] }, 'a'))).toBeNull()
    expect(kindFilter([])).toBeNull()
  })

  it('lists All with the total and each kind present with its count, in the order Place, Story, Tour, Keepsake', () => {
    const s: SearchSources = {
      stories: [storyCard({ title: 'Rigi one' }), storyCard({ title: 'Rigi two' })],
      pins: [mapItem({ title: 'Rigi pin' })],
      tours: [],
      keepsakes: [keepsakeCard({ name: 'Rigi mug' })],
    }

    expect(kindFilter(searchAll(s, 'rigi'))).toEqual([
      { kind: 'all', count: 4 },
      { kind: 'place', count: 1 },
      { kind: 'story', count: 2 },
      { kind: 'keepsake', count: 1 },
    ])
  })
})

describe('[E4.14][AC54][AC90][AC94] interestResults: a tile lists its stories, places and tours; shopping-keepsakes also every keepsake', () => {
  const s: SearchSources = {
    stories: [storyCard({ title: 'Story food', interests: ['food-drink'] }), storyCard({ title: 'Story shop', interests: ['shopping-keepsakes'] })],
    pins: [mapItem({ title: 'Pin food', interests: ['food-drink', 'history-culture'] }), mapItem({ title: 'Pin shop', interests: ['shopping-keepsakes'] })],
    tours: [tourCard({ title: 'Tour food', interests: ['food-drink'] }), tourCard({ title: 'Tour shop', interests: ['shopping-keepsakes'] })],
    keepsakes: [keepsakeCard({ name: 'Knife' }), keepsakeCard({ name: 'Mug' })],
  }

  it('ac-5 shopping-keepsakes lists its story, place and every keepsake', () => {
    expect(interestResults(s, 'shopping-keepsakes').map(r => [r.kind, r.title])).toEqual([
      ['story', 'Story shop'],
      ['place', 'Pin shop'],
      ['tour', 'Tour shop'],
      ['keepsake', 'Knife'],
      ['keepsake', 'Mug'],
    ])
  })

  it('another interest lists its stories, places and tours and no keepsake', () => {
    expect(interestResults(s, 'food-drink').map(r => r.title)).toEqual(['Story food', 'Pin food', 'Tour food'])
  })

  it('a place without a slug is left out of a tile too', () => {
    expect(interestResults({ ...none, pins: [mapItem({ title: 'No slug', slug: null, interests: ['food-drink'] })] }, 'food-drink')).toEqual([])
  })
})

describe('[E4.14][AC54][AC90][AC94] suggestNames: real names only, one kind after another', () => {
  const s: SearchSources = {
    stories: [storyCard({ title: 'Story one' }), storyCard({ title: 'Story two' })],
    pins: [mapItem({ title: 'Pin one' }), mapItem({ title: 'Pin hidden', slug: null }), mapItem({ title: 'Pin two' })],
    tours: [tourCard({ title: 'Tour one' })],
    keepsakes: [keepsakeCard({ name: 'Mug' })],
  }

  it('ac-6 returns the first titles of places, tours, stories and keepsakes in turn, up to the limit', () => {
    expect(suggestNames(s)).toEqual(['Pin one', 'Tour one', 'Story one'])
    expect(suggestNames(s, 6)).toEqual(['Pin one', 'Tour one', 'Story one', 'Mug', 'Pin two', 'Story two'])
  })

  it('every suggestion is a title in the data, and an empty data set gives none', () => {
    const all = new Set(['Story one', 'Story two', 'Pin one', 'Pin two', 'Tour one', 'Mug'])

    expect(suggestNames(s, 10).every(name => all.has(name))).toBe(true)
    expect(suggestNames(none)).toEqual([])
  })
})
