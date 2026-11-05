import type { PublicCategory, PublicMapItem } from '@sk/api-contract'

import { keepHighlighted } from '@/features/map/lib/categories'

/**
 * The map category the home's food section shows (decision G-S9-D-SMALL). The slug is made once from the category's first name and
 * never changes on a rename, so a merchant's rename keeps the section; a deleted category takes the section away.
 */
export const FOOD_CATEGORY_SLUG = 'food-and-drink'

/** How many cards the rail shows; the rest are behind "See all on the map" (owner, 05.11.2026). */
export const FOOD_PLACE_COUNT = 5

/**
 * What the section shows (owner, 05.11.2026): the five newest undated places of the food and drink category and its sub-categories,
 * in the order the server sends, which is newest first by first publish date (`order by p.first_published_at desc`). No ranking by
 * the guest's answers. A place with a date (a food festival) is left out: it belongs to "While you're in town". `subCategories` are
 * the category's sub-categories in the merchant's position order, for the card badge. Nothing when the category is not there or
 * holds no place.
 */
export function newestFoodPlaces(pins: readonly PublicMapItem[], categories: readonly PublicCategory[]) {
  const category = categories.find(candidate => candidate.slug === FOOD_CATEGORY_SLUG && candidate.parentId === null)

  if (!category)
    return undefined
  const places = keepHighlighted(pins, [category.id], categories).filter(pin => pin.nextDate === null).slice(0, FOOD_PLACE_COUNT)

  if (places.length === 0)
    return undefined
  const subCategories = categories.filter(candidate => candidate.parentId === category.id).sort((a, b) => a.position - b.position)

  return { category, places, subCategories }
}

export type FoodSelection = NonNullable<ReturnType<typeof newestFoodPlaces>>

/** The badge of a card: the place's first sub-category in position order, or the food and drink category itself when it has none. */
export function kindOf(pin: PublicMapItem, selection: FoodSelection) {
  return selection.subCategories.find(sub => pin.categoryIds.includes(sub.id)) ?? selection.category
}

/** A comma, then a Swiss postcode (four digits, maybe "CH-"): where the street part of an address ends. */
const POSTCODE = /,\s*(?:CH-)?\d{4}\b/

/** The street part of an address, before the postcode ("Weinmarkt 14, 6004 Luzern" gives "Weinmarkt 14"); the whole address when it has no postcode. */
export function streetOf(address: string) {
  return address.split(POSTCODE)[0]!.trim()
}
