import type { Answers, HomeItem } from '@/features/lab/home-data'

import { describe, expect, it } from 'vitest'

import {
  copy,
  DEFAULT_ORDER,
  GROUP_ORDER,
  groupKind,
  homeItems,
  homeShelves,
  kindGroups,
  mapCounts,
  occurrenceLabel,
  occurrences,
  pinItem,
  rankItems,
  rankShelves,
  searchHome,
  searchInterest,
  sectionsOf,
  shelfCount,
  shelfOf,
  whenOf,
} from '@/features/lab/home-data'
import { publicPins, rankPins, toGuestPin } from '@/features/lab/map-guest-data'
import { seedPins } from '@/features/lab/pins-merchant-data'

const answers: Answers[] = ['none', 'short-food', 'multi-history', 'lake-shopping']
const ids = (list: { id: string }[]) => list.map(item => item.id)
const sectionIds = (a: Answers, items = homeItems) => homeShelves(items, a).map(shelf => shelf.id)
function sectionItems(a: Answers, id: string, items = homeItems) {
  return ids(homeShelves(items, a).find(shelf => shelf.id === id)?.items ?? [])
}
function item(fields: Partial<HomeItem> & Pick<HomeItem, 'id'>): HomeItem {
  return { kind: 'story', slug: fields.id, title: { en: fields.id }, interests: [], free: false, publishedAt: '2026-10-01', ...fields }
}

describe('[S2 lab] home sections: order', () => {
  it('uses the default order, with More last, for a visitor who has not answered', () => {
    expect(rankShelves('none')).toEqual(DEFAULT_ORDER)
    expect(DEFAULT_ORDER).toEqual(['lake-mountains', 'free-useful', 'food-drink', 'local-activities', 'history-culture', 'shopping-keepsakes', 'more'])
    expect(sectionIds('none')).toEqual(DEFAULT_ORDER)
  })

  it('puts a short-stay food visitor’s interest first, then Free and useful', () => {
    expect(rankShelves('short-food')).toEqual(['food-drink', 'free-useful', 'lake-mountains', 'local-activities', 'history-culture', 'shopping-keepsakes', 'more'])
  })

  it('puts a multi-day history visitor’s interest first, then Free and useful', () => {
    expect(rankShelves('multi-history')).toEqual(['history-culture', 'free-useful', 'lake-mountains', 'food-drink', 'local-activities', 'shopping-keepsakes', 'more'])
  })

  it('puts a two-interest visitor’s first interest first and the second right after Free and useful', () => {
    expect(rankShelves('lake-shopping')).toEqual(['lake-mountains', 'free-useful', 'shopping-keepsakes', 'food-drink', 'local-activities', 'history-culture', 'more'])
  })

  it('hides no section for any visitor: every visitor gets the same sections', () => {
    for (const a of answers)
      expect([...sectionIds(a)].sort()).toEqual([...DEFAULT_ORDER].sort())
  })

  it('leaves out a section with nothing in it', () => {
    const noEvents = homeItems.filter(entry => !entry.interests.includes('local-activities'))

    expect(sectionIds('none', noEvents)).not.toContain('local-activities')
  })
})

describe('[S2 lab] home sections: membership', () => {
  it('shows every item exactly once across the sections, for every visitor', () => {
    for (const a of answers) {
      const shown = homeShelves(homeItems, a).flatMap(shelf => ids(shelf.items))

      expect(shown.sort()).toEqual(ids(homeItems).sort())
      expect(new Set(shown).size).toBe(shown.length)
    }
  })

  it('shows an item in the first of its sections in the visitor’s order', () => {
    // The Reuss flea market is in Local activities and in Shopping and keepsakes.
    expect(sectionItems('none', 'local-activities')).toContain('p12')
    expect(sectionItems('none', 'shopping-keepsakes')).not.toContain('p12')
    expect(sectionItems('lake-shopping', 'shopping-keepsakes')).toContain('p12')
    expect(sectionItems('lake-shopping', 'local-activities')).not.toContain('p12')
  })

  it('sends a free item to Free and useful', () => {
    const fountain = homeItems.find(entry => entry.id === 'p4')!

    expect(fountain.free).toBe(true)
    expect(sectionItems('none', 'free-useful')).toEqual(expect.arrayContaining(['p4', 'story-guest-card']))
    // A free item that also has an interest still belongs to both; Free and useful is first for everyone but the first interest.
    const freeFood = item({ id: 'free-food', interests: ['food-drink'], free: true })

    expect(sectionsOf(freeFood)).toEqual(['food-drink', 'free-useful'])
    expect(sectionItems('none', 'free-useful', [freeFood])).toEqual(['free-food'])
    expect(sectionItems('short-food', 'food-drink', [freeFood])).toEqual(['free-food'])
  })

  it('shows a tour in its own interest section', () => {
    expect(sectionItems('none', 'lake-mountains')).toEqual(expect.arrayContaining(['tour-rigi', 'tour-pilatus']))
    expect(sectionItems('none', 'history-culture')).toContain('tour-things-that-remain')
  })

  it('shows the keepsakes in Shopping and keepsakes only', () => {
    for (const a of answers) {
      const withKeepsakes = homeShelves(homeItems, a).filter(shelf => shelf.keepsakes.length > 0)

      expect(withKeepsakes.map(shelf => shelf.id)).toEqual(['shopping-keepsakes'])
    }
  })

  it('sends an item with no interest and no free flag to More', () => {
    const plain = item({ id: 'plain' })

    expect(sectionsOf(plain)).toEqual(['more'])
    expect(sectionItems('none', 'more', [plain])).toEqual(['plain'])
    // The lab data has one: the hotel.
    expect(sectionItems('none', 'more')).toEqual(['p10'])
    expect(rankShelves('none').at(-1)).toBe('more')
  })

  it('shows an event whose last date has passed nowhere', () => {
    // p6, the organ concert, had its only date on 26 Oct; the lab day is 28 Oct.
    const concert = pinItem(toGuestPin(seedPins.find(p => p.id === 'p6')!)!)

    expect(sectionsOf(concert)).toEqual([])
    expect(shelfOf(concert)).toBeUndefined()
    for (const a of answers)
      expect(homeShelves([...homeItems, concert], a).flatMap(shelf => ids(shelf.items))).not.toContain('p6')
  })
})

describe('[S2 lab] home sections: order inside a section', () => {
  it('keeps events still ahead first, soonest first, whatever the answers', () => {
    for (const a of answers) {
      const events = sectionItems(a, 'local-activities')

      // The Saturday flea market (31 Oct) before the jazz evenings (14 Nov), then the Fasnacht story.
      expect(events.slice(0, 2)).toEqual(a === 'lake-shopping' ? ['p8', 'story-fasnacht'] : ['p12', 'p8'])
    }
  })

  it('puts items that fit the stay length before the others, and never changes the sections', () => {
    const short = item({ id: 'short', interests: ['food-drink'], stay: 'short-stay', publishedAt: '2026-10-01' })
    const multi = item({ id: 'multi', interests: ['food-drink'], stay: 'multi-day', publishedAt: '2026-10-20' })
    const both = item({ id: 'both', interests: ['food-drink'], stay: 'both', publishedAt: '2026-10-02' })
    const untagged = item({ id: 'untagged', interests: ['food-drink'], publishedAt: '2026-10-03' })
    const list = [short, multi, both, untagged]

    // short-food is a short-stay visitor: multi-day goes last although it is the newest.
    expect(sectionItems('short-food', 'food-drink', list).at(-1)).toBe('multi')
    expect(sectionItems('short-food', 'food-drink', list)).toHaveLength(4)
    // multi-history is a multi-day visitor: short-stay goes last, multi-day first.
    expect(sectionItems('multi-history', 'food-drink', list).at(-1)).toBe('short')
    expect(sectionItems('multi-history', 'food-drink', list)[0]).toBe('multi')
    // No answers: no stay, so everything fits and it is newest first.
    expect(sectionItems('none', 'food-drink', list)).toEqual(['multi', 'untagged', 'both', 'short'])
    expect(sectionIds('short-food', list)).toEqual(sectionIds('multi-history', list))
  })

  it('ranks pins exactly like the map', () => {
    for (const a of answers)
      expect(ids(rankItems(publicPins.map(pinItem), a))).toEqual(ids(rankPins(publicPins, a)))
  })
})

describe('[S2 lab] map entry counts', () => {
  it('counts only events still ahead, and an ended event in neither count', () => {
    const concert = toGuestPin(seedPins.find(p => p.id === 'p6')!)!

    expect(mapCounts(publicPins)).toEqual({ places: 9, events: 2 })
    expect(mapCounts([...publicPins, concert])).toEqual({ places: 9, events: 2 })
  })
})

describe('[S2 lab] event dates', () => {
  it('reads the Saturday-only flea market as this weekend, not today', () => {
    const market = publicPins.find(p => p.id === 'p12')!
    const next = occurrences(market)[0]!

    expect(next).toEqual({ day: '2026-10-31', starts: '08:00', ends: '16:00' })
    expect(whenOf(next.day)).toBe('weekend')
    expect(occurrenceLabel(next, 'en')).toBe('Sat, 31 Oct, 08:00–16:00')
  })

  it('names today and tomorrow', () => {
    expect(whenOf('2026-10-28')).toBe('today')
    expect(whenOf('2026-10-29')).toBe('tomorrow')
    expect(whenOf('2026-11-14')).toBe('date')
  })
})

describe('[S2 lab] search', () => {
  it('finds a place without its accents and sends it to the map', () => {
    const [hit] = searchHome('lowen', homeItems, 'en')

    expect(hit).toMatchObject({ id: 'p1', kind: 'place', href: '/en/map?place=lion-monument' })
  })

  it('shows no price on any hit', () => {
    const text = JSON.stringify(searchHome('victorinox', homeItems, 'de'))

    expect(text).not.toMatch(/CHF|\d+\.\d{2}/)
  })

  it('finds tours and opens their information page', () => {
    const [hit] = searchHome('rigi', homeItems, 'en')

    expect(hit).toMatchObject({ id: 'tour-rigi', kind: 'tour', href: '/en/tours/rigi-from-lake-to-sky' })
  })

  it('lists everything with an interest, and keepsakes under shopping', () => {
    const food = searchInterest('food-drink', homeItems, 'en').map(hit => hit.id)

    expect(food.sort()).toEqual(['p15', 'p3', 'story-slow-morning-weinmarkt'])
    const local = searchInterest('local-activities', homeItems, 'en').map(hit => hit.id)

    expect(local.sort()).toEqual(['p12', 'p8', 'story-fasnacht'])
    const shopping = searchInterest('shopping-keepsakes', homeItems, 'en')

    expect(shopping.map(hit => hit.kind)).toContain('keepsake')
    expect(shopping.map(hit => hit.id)).toContain('p12')
  })
})

describe('[S2 lab] counts under five', () => {
  it('prints no number below five, in English and German', () => {
    for (const language of ['en', 'de'] as const) {
      const c = copy[language]

      for (const n of [2, 4]) {
        for (const text of [c.seeAll(n), c.onMap(n), c.mapAll(n), c.mapShelf('X', n), c.mapBody(n, n)])
          expect(text).not.toMatch(/\d/)
      }
      expect(c.seeAll(5)).toContain('5')
      expect(c.onMap(5)).toContain('5')
      expect(c.mapAll(9)).toContain('9')
      expect(c.mapBody(9, 5)).toContain('9')
    }
    expect(copy.en.onMap(2)).toBe('Show them on the map')
  })

  it('counts only the kinds with five or more items', () => {
    const five = Array.from({ length: 5 }, (_, i) => item({ id: `place-${i}`, kind: 'place' }))

    expect(shelfCount({ id: 'more', items: five, places: five, keepsakes: [] }, 'en')).toBe('5 places')
    expect(shelfCount({ id: 'more', items: five.slice(0, 4), places: [], keepsakes: [] }, 'en')).toBeUndefined()
    expect(shelfCount(homeShelves(homeItems, 'none').find(entry => entry.id === 'free-useful')!, 'en')).toBeUndefined()
  })
})

describe('[S2 lab] home sections: kinds never mix', () => {
  it('splits every section of every visitor into groups of one kind, in the fixed kind order, keeping the ranked order', () => {
    for (const a of answers) {
      for (const shelf of homeShelves(homeItems, a)) {
        const groups = kindGroups(shelf.items)

        expect(groups.flatMap(group => ids(group.items)).sort()).toEqual(ids(shelf.items).sort())
        for (const group of groups) {
          expect(group.items.every(entry => groupKind(entry) === group.kind)).toBe(true)
          expect(ids(group.items)).toEqual(ids(shelf.items).filter(id => group.items.some(entry => entry.id === id)))
        }
        expect(groups.map(group => GROUP_ORDER.indexOf(group.kind))).toEqual(groups.map(group => GROUP_ORDER.indexOf(group.kind)).sort((x, y) => x - y))
      }
    }
  })

  it('drops the kinds a section does not have', () => {
    const story = item({ id: 's' })
    const groups = kindGroups([story])

    expect(groups).toEqual([{ kind: 'story', items: [story] }])
  })
})
