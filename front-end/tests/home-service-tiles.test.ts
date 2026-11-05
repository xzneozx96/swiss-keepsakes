import type { PublicCategory, PublicMapItem } from '@sk/api-contract'

import { describe, expect, it } from 'vitest'
import { serviceTiles } from '@/features/home/lib/service-tiles'

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

function category(n: number, extra: Partial<PublicCategory> = {}): PublicCategory {
  return { id: id(n), slug: `c${n}`, name: { en: `Name ${n}`, de: `Name ${n} DE` }, parentId: null, icon: null, showOnHome: true, storyCount: 0, position: n, ...extra }
}

function pin(n: number, categoryIds: string[]): PublicMapItem {
  return {
    id: id(100 + n),
    slug: `pin-${n}`,
    latitude: 47.05,
    longitude: 8.3,
    address: null,
    weeklyHours: [],
    title: `Pin ${n}`,
    language: 'en',
    categoryIds,
    stayTag: 'both',
    interests: [],
    nextDate: null,
    hasMainStory: false,
    mainStorySlug: null,
    photoUrl: null,
    photoVariants: [],
    mustVisit: false,
    tip: '',
  }
}

describe('[E4.13][AC95] service tiles: which categories become tiles', () => {
  it('lists the Show on the home categories with a pin, in position order, with their icon and slug (AC-1)', () => {
    const toilets = category(2, { name: { en: 'Toilets', de: 'Toiletten' }, icon: 'toilet', slug: 'toilets' })
    const water = category(1, { name: { en: 'Drinking water', de: 'Trinkwasser' }, icon: 'water', slug: 'drinking-water' })
    const museums = category(3, { showOnHome: false, slug: 'museums' })
    const tiles = serviceTiles([toilets, museums, water], [pin(1, [water.id]), pin(2, [toilets.id]), pin(3, [museums.id])], 'en')

    expect(tiles.map(tile => [tile.name, tile.slug, tile.icon])).toEqual([
      ['Drinking water', 'drinking-water', 'water'],
      ['Toilets', 'toilets', 'toilet'],
    ])
  })

  it('leaves out a category with no pin in it or below it (AC-2)', () => {
    const empty = category(1)
    const other = category(2)

    expect(serviceTiles([empty, other], [pin(1, [other.id])], 'en').map(tile => tile.id)).toEqual([other.id])
    expect(serviceTiles([empty], [], 'en')).toEqual([])
  })

  it('a category with no pin of its own shows when a sub-category has one, and a sub-category pin is not lost two levels down (AC-2)', () => {
    const parent = category(1)
    const child = category(2, { parentId: parent.id, showOnHome: false })
    const grandchild = category(3, { parentId: child.id, showOnHome: false })

    expect(serviceTiles([parent, child, grandchild], [pin(1, [child.id])], 'en').map(tile => tile.id)).toEqual([parent.id])
    expect(serviceTiles([parent, child, grandchild], [pin(1, [grandchild.id])], 'en').map(tile => tile.id)).toEqual([parent.id])
  })

  it('a pin in a sibling branch does not light the tile (AC-2)', () => {
    const parent = category(1)
    const sibling = category(2, { showOnHome: false })

    expect(serviceTiles([parent, sibling], [pin(1, [sibling.id])], 'en')).toEqual([])
  })

  it('names the tile in the guest language, and in the other language with its tag when only that exists (AC-3)', () => {
    const englishOnly = category(1, { name: { en: 'Lockers', de: null } })
    const both = category(2)
    const pins = [pin(1, [englishOnly.id]), pin(2, [both.id])]

    expect(serviceTiles([englishOnly, both], pins, 'de').map(tile => [tile.name, tile.nameLanguage])).toEqual([
      ['Lockers', 'en'],
      ['Name 2 DE', null],
    ])
    expect(serviceTiles([englishOnly, both], pins, 'en').map(tile => [tile.name, tile.nameLanguage])).toEqual([
      ['Lockers', null],
      ['Name 2', null],
    ])
  })

  it('falls back to the slug, without a tag, when the category has no name at all (AC-3)', () => {
    const nameless = category(1, { name: { en: null, de: null }, slug: 'nameless' })

    expect(serviceTiles([nameless], [pin(1, [nameless.id])], 'en').map(tile => [tile.name, tile.nameLanguage])).toEqual([['nameless', null]])
  })

  it('does not change its inputs', () => {
    const categories = [category(2), category(1)]
    const before = categories.map(c => c.id)

    serviceTiles(categories, [pin(1, [categories[0]!.id])], 'en')

    expect(categories.map(c => c.id)).toEqual(before)
  })
})
