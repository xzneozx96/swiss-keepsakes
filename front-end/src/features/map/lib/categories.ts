import type { PublicCategory, PublicMapItem } from '@sk/api-contract'

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
