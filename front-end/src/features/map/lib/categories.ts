import type { CategoryIcon, PublicCategory, PublicMapItem } from '@sk/api-contract'

import { placeIcon } from '@sk/domain/content'

type Language = 'en' | 'de'

/** The categories the Categories sheet lists: the top level only, in the merchant's order. */
export function topLevelCategories(categories: readonly PublicCategory[]) {
  return categories
    .filter(category => category.parentId === null)
    .sort((a, b) => a.position - b.position)
}

export function categoryName(category: PublicCategory, language: Language) {
  const other = language === 'en' ? 'de' : 'en'

  return category.name[language] ?? category.name[other] ?? category.slug
}

/**
 * Whether a pin is lit under the chosen top-level categories. No choice means All, which lights
 * every pin (a pin with no category too). A parent covers a pin tagged only with one of its
 * sub-categories (ADR-030), so the pin's own ids and their parents are both checked.
 */
export function isHighlighted(
  pin: PublicMapItem,
  chosen: readonly string[],
  categories: readonly PublicCategory[],
) {
  if (chosen.length === 0)
    return true

  const parentOf = new Map(categories.map(category => [category.id, category.parentId]))

  return pin.categoryIds.some((id) => {
    const parent = parentOf.get(id)

    return chosen.includes(id) || (parent != null && chosen.includes(parent))
  })
}

/** The pins the list and the card row hold. The map itself keeps every pin and dims the rest. */
export function keepHighlighted(
  pins: readonly PublicMapItem[],
  chosen: readonly string[],
  categories: readonly PublicCategory[],
) {
  return pins.filter(pin => isHighlighted(pin, chosen, categories))
}

export function countHighlighted(
  pins: readonly PublicMapItem[],
  id: string,
  categories: readonly PublicCategory[],
) {
  return keepHighlighted(pins, [id], categories).length
}

/** The names a list row shows: the pin's most specific categories (a parent that the server added beside its sub-category is left out). */
export function pinCategoryNames(
  pin: PublicMapItem,
  categories: readonly PublicCategory[],
  language: Language,
) {
  const own = categories.filter(category => pin.categoryIds.includes(category.id))
  const parents = new Set(own.map(category => category.parentId))

  return own.filter(category => !parents.has(category.id)).map(category => categoryName(category, language))
}

/** What the map holds the guest to: the chosen categories (none means All) and, when set, only the pins with a next date. Both must hold. */
export interface MapPinFilter {
  chosen: readonly string[]
  datedOnly: boolean
}

export function isLit(pin: PublicMapItem, filter: MapPinFilter, categories: readonly PublicCategory[]) {
  return (!filter.datedOnly || pin.nextDate !== null) && isHighlighted(pin, filter.chosen, categories)
}

export function keepFiltered(pins: readonly PublicMapItem[], filter: MapPinFilter, categories: readonly PublicCategory[]) {
  return pins.filter(pin => isLit(pin, filter, categories))
}

/** The icon a pin draws where it has no photo: its first category with an icon (a sub-category takes its parent's), or null for the plain pin. */
export function pinIcon(pin: PublicMapItem, categories: readonly PublicCategory[]): CategoryIcon | null {
  return placeIcon(pin.categoryIds, categories)
}
