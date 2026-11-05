import type { PublicCategory, PublicMapItem } from '@sk/api-contract'

import { describe, expect, it } from 'vitest'

import { FOOD_CATEGORY_SLUG, FOOD_PLACE_COUNT, kindOf, newestFoodPlaces, streetOf } from '@/features/home/lib/food-map'

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

function category(n: number, slug: string, name: string, parentId: string | null = null, position = n): PublicCategory {
  return { id: id(n), slug, name: { en: name, de: name }, parentId, icon: null, showOnHome: false, position }
}

function pin(n: number, categoryIds: string[], extra: Partial<PublicMapItem> = {}): PublicMapItem {
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
    ...extra,
  }
}

const food = category(1, FOOD_CATEGORY_SLUG, 'Food and drink')
// Positions put the bars before the bakeries although the bakeries were made first.
const bakeries = category(2, 'bakeries', 'Bakeries', food.id, 20)
const bars = category(3, 'bars', 'Bars', food.id, 10)
const fondue = category(4, 'fondue', 'Fondue', food.id, 30)
const walks = category(5, 'walks', 'Walks')
// A sub-category of another parent with the food slug: it is not the section's category.
const lakeFood = category(6, FOOD_CATEGORY_SLUG, 'Food on the lake', walks.id)
const categories = [walks, food, bakeries, bars, fondue, lakeFood]
const festival = { firstDay: '2090-11-07', lastDay: '2090-11-08', startTime: null, endTime: null }
const ids = (places: readonly PublicMapItem[]) => places.map(place => place.id)

describe('[E4.13][AC54][AC95] the food section selection (owner, 05.11.2026)', () => {
  it('finds the top-level category by its slug and keeps it and its sub-categories only', () => {
    const cafe = pin(1, [food.id])
    const bakery = pin(2, [bakeries.id, food.id])
    const bakeryOnly = pin(3, [bakeries.id])
    const walk = pin(4, [walks.id])
    const lake = pin(5, [lakeFood.id])
    const selection = newestFoodPlaces([walk, cafe, lake, bakery, bakeryOnly], categories)

    expect(FOOD_CATEGORY_SLUG).toBe('food-and-drink')
    expect(selection?.category.id).toBe(food.id)
    expect(ids(selection!.places)).toEqual([cafe.id, bakery.id, bakeryOnly.id])
  })

  it('keeps the server order (newest first) and takes the first five of more for All, ignoring the guest’s interests', () => {
    const places = Array.from({ length: 8 }, (_, index) => pin(index + 1, [food.id], index === 7 ? { interests: ['food-drink'], mustVisit: true } : {}))

    expect(FOOD_PLACE_COUNT).toBe(5)
    expect(ids(newestFoodPlaces(places, categories)!.places)).toEqual(ids(places.slice(0, 5)))
  })

  it('leaves out a place with a date (it belongs to the events section) and fills up with the next undated one', () => {
    const places = [pin(1, [food.id], { nextDate: festival }), ...Array.from({ length: 5 }, (_, index) => pin(index + 2, [food.id]))]

    expect(ids(newestFoodPlaces(places, categories)!.places)).toEqual(ids(places.slice(1, 6)))
  })

  it('badges a card with its first kind in position order, or the food and drink category when it has none', () => {
    const barAndBakery = pin(1, [food.id, bakeries.id, bars.id])
    const plain = pin(2, [food.id])
    const selection = newestFoodPlaces([barAndBakery, plain], categories)!

    expect(kindOf(barAndBakery, selection).slug).toBe('bars')
    expect(kindOf(plain, selection).slug).toBe(FOOD_CATEGORY_SLUG)
  })

  it('gives nothing without the category, without a place, or with only dated places', () => {
    expect(newestFoodPlaces([pin(1, [food.id])], [walks, lakeFood])).toBeUndefined()
    expect(newestFoodPlaces([pin(1, [walks.id])], categories)).toBeUndefined()
    expect(newestFoodPlaces([pin(1, [food.id], { nextDate: festival })], categories)).toBeUndefined()
  })

  it('keeps the section after a rename: the slug, not the name, finds the category', () => {
    const renamed = { ...food, name: { en: 'Restaurants', de: 'Restaurants' } }
    const cafe = pin(1, [food.id])

    expect(newestFoodPlaces([cafe], [renamed])?.places[0]!.id).toBe(cafe.id)
  })

  it('shortens an address to the street, before the postcode', () => {
    expect(streetOf('Weinmarkt 14, 6004 Luzern')).toBe('Weinmarkt 14')
    expect(streetOf('Rathausquai, Unter der Egg, 6004 Luzern')).toBe('Rathausquai, Unter der Egg')
    expect(streetOf('Löwenplatz 9, CH-6004 Luzern')).toBe('Löwenplatz 9')
    expect(streetOf('Bahnhof Luzern')).toBe('Bahnhof Luzern')
  })
})
