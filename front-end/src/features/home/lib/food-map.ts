import type { PublicCategory, PublicMapItem } from '@sk/api-contract'

import { keepHighlighted } from '@/features/map/lib/categories'

/**
 * The map category the home's food section shows (decision G-S9-D-SMALL). The slug is made once from the category's first name and
 * never changes on a rename, so a merchant's rename keeps the section; a deleted category takes the section away.
 */
export const FOOD_CATEGORY_SLUG = 'food-and-drink'

/** How many places the section shows: the highlight and up to four in the rail. */
export const FOOD_PLACE_COUNT = 5

/**
 * What the section shows (owner, 05.11.2026): the food and drink category and the first five places of it and its
 * sub-categories in the order the server sends, which is newest first by first publish date (`order by p.first_published_at
 * desc`). No ranking by the guest's answers. A place with a date (a food festival) is left out: it belongs to "While you're in
 * town". The newest is the `highlight`, the others go to the rail (`more`). Nothing when the category is not there or holds no place.
 */
export function newestFoodPlaces(pins: readonly PublicMapItem[], categories: readonly PublicCategory[]) {
  const category = categories.find(candidate => candidate.slug === FOOD_CATEGORY_SLUG && candidate.parentId === null)

  if (!category)
    return undefined
  const [highlight, ...more] = keepHighlighted(pins, [category.id], categories)
    .filter(pin => pin.nextDate === null)
    .slice(0, FOOD_PLACE_COUNT)

  return highlight ? { category, highlight, more } : undefined
}
