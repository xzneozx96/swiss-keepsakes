import type { PublicCategory, PublicMapItem } from '@sk/api-contract'
import type { RankPrefs } from '@sk/domain/content'

import { keepHighlighted } from '@/features/map/lib/categories'
import { mustVisitOrder } from './must-visits'

/**
 * The map category the home's food map shows (decision G-S9-D-SMALL). The slug is made once from the category's first name and
 * never changes on a rename, so a merchant's rename keeps the section; a deleted category takes the section away.
 */
export const FOOD_CATEGORY_SLUG = 'food-and-drink'

/**
 * What the section shows: the food and drink category, every pin in the guest's order (interests first, then the stay, as the
 * postcards are ordered; the map draws them all and dims the
 * rest), and `kept`, the pins of the category and its sub-categories that the card row and the list hold. Nothing when the category is not there.
 */
export function foodMapSelection(pins: readonly PublicMapItem[], categories: readonly PublicCategory[], prefs: RankPrefs) {
  const category = categories.find(candidate => candidate.slug === FOOD_CATEGORY_SLUG && candidate.parentId === null)

  if (!category)
    return undefined
  const ranked = mustVisitOrder(pins, prefs)

  return { category, ranked, kept: keepHighlighted(ranked, [category.id], categories) }
}
