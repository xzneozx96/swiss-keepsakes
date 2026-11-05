import type { PublicCategory, PublicMapItem } from '@sk/api-contract'

import { describe, expect, it } from 'vitest'

import { keepFiltered } from '@/features/map/lib/categories'
import { filterAddress, resolveMapFilter, validateMapSearch } from '@/features/map/lib/search-params'

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

function category(n: number, slug: string, parentId: string | null): PublicCategory {
  return { id: id(n), slug, name: { en: slug, de: slug }, parentId, icon: null, showOnHome: false, storyCount: 0, position: n }
}

function pin(n: number, categoryIds: string[], dated = false): PublicMapItem {
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
    nextDate: dated ? { firstDay: '2026-11-07', lastDay: '2026-11-07', startTime: null, endTime: null } : null,
    hasMainStory: false,
    mainStorySlug: null,
    photoUrl: null,
    photoVariants: [],
    mustVisit: false,
    tip: '',
  }
}

const food = category(1, 'food-and-drink', null)
const bakeries = category(2, 'bakeries', food.id)
const walks = category(3, 'walks', null)
const categories = [food, bakeries, walks]

const bakery = pin(1, [bakeries.id, food.id])
const restaurant = pin(2, [food.id], true)
const walk = pin(3, [walks.id])
const concert = pin(4, [], true)
const pins = [bakery, restaurant, walk, concert]
const titles = (list: PublicMapItem[]) => list.map(item => item.title)

describe('[E4.13][AC42][AC90] validateMapSearch', () => {
  it('aC-4 keeps place and category, still reads an old dated=1 (to be cleaned) and drops every other value', () => {
    expect(validateMapSearch({ place: 'a', category: 'food-and-drink', dated: 1 })).toEqual({ place: 'a', category: 'food-and-drink', dated: 1 })
    expect(validateMapSearch({ dated: '1' })).toEqual({ dated: 1 })
    expect(validateMapSearch({ dated: 2, place: '' })).toEqual({})
    expect(validateMapSearch({ dated: true, place: 5 })).toEqual({})
  })

  it('aC-4 keeps an empty category so the screen can name the problem, and reads a number as its text', () => {
    expect(validateMapSearch({ category: '' })).toEqual({ category: '' })
    expect(validateMapSearch({ category: 7 })).toEqual({ category: '7' })
    expect(validateMapSearch({ category: ['a'] })).toEqual({})
  })
})

describe('[E4.13][AC42][AC90] resolveMapFilter', () => {
  it('aC-1 a parent slug chooses the parent, which covers its sub-categories', () => {
    const filter = resolveMapFilter({ category: 'food-and-drink' }, categories)

    expect(filter).toMatchObject({ chosen: [food.id], unknownCategory: false, addressChanged: false })
    expect(titles(keepFiltered(pins, filter, categories))).toEqual(['Pin 1', 'Pin 2'])
  })

  it('aC-2 a sub-category slug chooses only that sub-category', () => {
    const filter = resolveMapFilter({ category: 'bakeries' }, categories)

    expect(filter.chosen).toEqual([bakeries.id])
    expect(titles(keepFiltered(pins, filter, categories))).toEqual(['Pin 1'])
  })

  it('aC-1 several slugs separated by commas choose each of them', () => {
    expect(resolveMapFilter({ category: 'bakeries,walks' }, categories).chosen).toEqual([bakeries.id, walks.id])
  })

  it('aC-3 a legacy dated is not applied: it is cleaned from the address and every pin stays', () => {
    const filter = resolveMapFilter({ dated: 1 }, categories)

    expect(filter).toMatchObject({ chosen: [], address: {}, addressChanged: true })
    expect(titles(keepFiltered(pins, filter, categories))).toHaveLength(4)
  })

  it('aC-3 a legacy dated beside a category keeps the category and cleans dated', () => {
    const filter = resolveMapFilter({ category: 'food-and-drink', dated: 1 }, categories)

    expect(filter).toMatchObject({ chosen: [food.id], address: { category: 'food-and-drink' }, addressChanged: true })
    expect(titles(keepFiltered(pins, filter, categories))).toEqual(['Pin 1', 'Pin 2'])
  })

  it('aC-4 an unknown or empty slug opens unfiltered, flags the problem and drops the parameter', () => {
    for (const category of ['nope', '']) {
      const filter = resolveMapFilter({ category }, categories)

      expect(filter).toMatchObject({ chosen: [], unknownCategory: true, address: {}, addressChanged: true })
      expect(titles(keepFiltered(pins, filter, categories))).toHaveLength(4)
    }
  })

  it('aC-4 an unknown slug beside a known one keeps the known one and flags the problem', () => {
    expect(resolveMapFilter({ category: 'walks,nope' }, categories)).toMatchObject({ chosen: [walks.id], unknownCategory: true, address: { category: 'walks' }, addressChanged: true })
  })

  it('aC-6 a place clears category and dated, and the address loses them', () => {
    const filter = resolveMapFilter({ place: 'pin-3', category: 'food-and-drink', dated: 1 }, categories)

    expect(filter).toMatchObject({ chosen: [], unknownCategory: false, address: { place: 'pin-3' }, addressChanged: true })
    expect(keepFiltered(pins, filter, categories)).toHaveLength(4)
  })

  it('aC-6 a place with no filter leaves the address alone', () => {
    expect(resolveMapFilter({ place: 'pin-3' }, categories)).toMatchObject({ address: { place: 'pin-3' }, addressChanged: false })
  })
})

describe('[E4.13][AC42][AC93] filterAddress', () => {
  it('aC-5 writes the chosen ids as slugs, and nothing when nothing is chosen', () => {
    expect(filterAddress([food.id], categories)).toEqual({ category: 'food-and-drink' })
    expect(filterAddress([bakeries.id, walks.id], categories)).toEqual({ category: 'bakeries,walks' })
    expect(filterAddress([], categories)).toEqual({})
  })
})
