import type { CategoryIcon, PublicCategory, PublicMapItem } from '@sk/api-contract'

type Language = 'en' | 'de'

export interface ServiceTile {
  id: string
  /** The address of the map filter this tile opens (`?category=<slug>`). */
  slug: string
  name: string
  /** The language of `name` when it is not the guest's (AC64), else null. */
  nameLanguage: Language | null
  icon: CategoryIcon | null
}

/** The category and everything below it, so a pin tagged only with a sub-category counts for the parent (ADR-030). */
function branchIds(category: PublicCategory, categories: readonly PublicCategory[]) {
  const ids = new Set([category.id])
  let grew = true

  while (grew) {
    grew = false
    for (const candidate of categories) {
      if (candidate.parentId !== null && ids.has(candidate.parentId) && !ids.has(candidate.id)) {
        ids.add(candidate.id)
        grew = true
      }
    }
  }

  return ids
}

/**
 * The tiles of "Sorted before you unpack" (G-S9-TILES, G-S9-EMPTY-TILE): the map categories with Show on the home on, in
 * position order, named in the guest's language (the other one with its tag when that is all there is). A tile shows only
 * when its category, with its sub-categories, holds at least one pin of the public map, which carries published pins only.
 */
export function serviceTiles(
  categories: readonly PublicCategory[],
  pins: readonly PublicMapItem[],
  language: Language,
): ServiceTile[] {
  const other = language === 'en' ? 'de' : 'en'

  return categories
    .filter(category => category.showOnHome)
    .sort((a, b) => a.position - b.position)
    .filter((category) => {
      const ids = branchIds(category, categories)

      return pins.some(pin => pin.categoryIds.some(id => ids.has(id)))
    })
    .map((category) => {
      const own = category.name[language]
      const fallback = category.name[other]

      return {
        id: category.id,
        slug: category.slug,
        name: own ?? fallback ?? category.slug,
        nameLanguage: own === null && fallback !== null ? other : null,
        icon: category.icon,
      }
    })
}
