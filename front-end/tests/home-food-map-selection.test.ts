import type { PublicCategory, PublicMapItem } from '@sk/api-contract'

import { describe, expect, it } from 'vitest'

import { FOOD_CATEGORY_SLUG, foodMapSelection } from '@/features/home/lib/food-map'

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
const categories = [walks, food, bakeries]

const walk = pin(1, [walks.id], { interests: ['history-culture'] })
const cafe = pin(2, [food.id])
const bakery = pin(3, [bakeries.id, food.id])
const bakeryOnly = pin(4, [bakeries.id])
const nowhere = pin(5, [])
const pins = [walk, cafe, bakery, bakeryOnly, nowhere]

describe('[E4.13][AC54][AC95] the food map selection', () => {
  it('aC-3 keeps the pins of the food and drink category and of its sub-categories, and finds the category by its slug', () => {
    const selection = foodMapSelection(pins, categories, {})

    expect(FOOD_CATEGORY_SLUG).toBe('food-and-drink')
    expect(selection?.category.id).toBe(food.id)
    expect(selection?.kept.map(item => item.id)).toEqual([cafe.id, bakery.id, bakeryOnly.id])
    // The map keeps every pin (the others are dimmed there).
    expect(selection?.ranked).toHaveLength(pins.length)
  })

  it('aC-4 puts the pins that match the answers first and hides none', () => {
    const tagged = [
      pin(10, [food.id]),
      pin(11, [food.id], { interests: ['food-drink'] }),
      pin(12, [walks.id], { interests: ['food-drink'] }),
      pin(13, [bakeries.id], { interests: ['food-drink', 'history-culture'] }),
    ]
    const plain = foodMapSelection(tagged, categories, {})!
    const answered = foodMapSelection(tagged, categories, { interests: ['food-drink'] })!

    expect(plain.kept.map(item => item.id)).toEqual([id(110), id(111), id(113)])
    expect(answered.kept.map(item => item.id)).toEqual([id(111), id(113), id(110)])
    expect(answered.kept).toHaveLength(plain.kept.length)
    expect(answered.ranked).toHaveLength(tagged.length)
    expect(answered.ranked.map(item => item.id).sort()).toEqual(tagged.map(item => item.id).sort())
  })

  it('aC-4 orders by the stay as the map list does, and ignores an interest code it does not know', () => {
    const short = pin(20, [food.id], { stayTag: 'short_stay' })
    const multi = pin(21, [food.id], { stayTag: 'multi_day' })
    const both = pin(22, [food.id], { stayTag: 'both', interests: ['not-an-interest'] })

    expect(foodMapSelection([multi, short, both], categories, { stay: 'short_stay' })!.kept.map(item => item.id)).toEqual([short.id, both.id, multi.id])
  })

  it('aC-5a gives nothing when the category is not there', () => {
    expect(foodMapSelection(pins, [walks], {})).toBeUndefined()
    expect(foodMapSelection([], [], {})).toBeUndefined()
  })

  it('aC-5b still finds the category after a merchant renamed it, because the slug stays', () => {
    const renamed = { ...food, name: { en: 'Restaurants', de: 'Restaurants' } }
    const selection = foodMapSelection(pins, [walks, renamed, bakeries], {})

    expect(selection?.category.name.en).toBe('Restaurants')
    expect(selection?.kept).toHaveLength(3)
  })

  it('aC-5 is not fooled by a category that only has the food name', () => {
    const lookalike = category(9, 'restaurants', 'Food and drink')

    expect(foodMapSelection(pins, [walks, lookalike], {})).toBeUndefined()
  })
})
