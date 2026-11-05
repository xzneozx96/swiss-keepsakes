import type { PublicCategory, PublicMapItem } from '@sk/api-contract'

import { describe, expect, it } from 'vitest'

import { FOOD_CATEGORY_SLUG, FOOD_PLACE_COUNT, newestFoodPlaces } from '@/features/home/lib/food-map'

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

function category(n: number, slug: string, name: string, parentId: string | null = null): PublicCategory {
  return { id: id(n), slug, name: { en: name, de: name }, parentId, icon: null, showOnHome: false, position: n }
}

function pin(n: number, categoryIds: string[], extra: Partial<PublicMapItem> = {}): PublicMapItem {
  return {
    id: id(100 + n),
    slug: `pin-${n}`,
    latitude: 47.05,
    longitude: 8.3,
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
const bakeries = category(2, 'bakeries', 'Bakeries', food.id)
const walks = category(3, 'walks', 'Walks')
// A sub-category of another parent that happens to carry a food-like slug: it is not the section's category.
const lakeFood = category(4, FOOD_CATEGORY_SLUG, 'Food on the lake', walks.id)
const categories = [walks, food, bakeries, lakeFood]
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
    expect([selection!.highlight.id, ...ids(selection!.more)]).toEqual([cafe.id, bakery.id, bakeryOnly.id])
  })

  it('keeps the server order (newest first) and takes the first five of more, ignoring the guest’s interests', () => {
    const places = Array.from({ length: 7 }, (_, index) => pin(index + 1, [food.id], index === 6 ? { interests: ['food-drink'], mustVisit: true } : {}))
    const selection = newestFoodPlaces(places, categories)!

    expect(FOOD_PLACE_COUNT).toBe(5)
    expect(selection.highlight.id).toBe(places[0]!.id)
    expect(ids(selection.more)).toEqual(ids(places.slice(1, 5)))
  })

  it('leaves out a place with a date (it belongs to the events section) and fills up with the next undated one', () => {
    const places = [pin(1, [food.id], { nextDate: festival }), ...Array.from({ length: 5 }, (_, index) => pin(index + 2, [food.id]))]
    const selection = newestFoodPlaces(places, categories)!

    expect(selection.highlight.id).toBe(places[1]!.id)
    expect(ids(selection.more)).toEqual(ids(places.slice(2, 6)))
  })

  it('has a highlight and an empty rail with one place', () => {
    const only = pin(1, [bakeries.id])

    expect(newestFoodPlaces([only], categories)).toEqual({ category: food, highlight: only, more: [] })
  })

  it('gives nothing without the category, without a place, or with only dated places', () => {
    expect(newestFoodPlaces([pin(1, [food.id])], [walks, lakeFood])).toBeUndefined()
    expect(newestFoodPlaces([pin(1, [walks.id])], categories)).toBeUndefined()
    expect(newestFoodPlaces([pin(1, [food.id], { nextDate: festival })], categories)).toBeUndefined()
  })

  it('keeps the section after a rename: the slug, not the name, finds the category', () => {
    const renamed = { ...food, name: { en: 'Restaurants', de: 'Restaurants' } }
    const cafe = pin(1, [food.id])

    expect(newestFoodPlaces([cafe], [renamed])?.highlight.id).toBe(cafe.id)
  })
})
