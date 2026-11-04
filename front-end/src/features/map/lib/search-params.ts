import type { PublicCategory } from '@sk/api-contract'

/** The address of the guest map: `?place=<pin slug>`, `?category=<slug>[,<slug>]` and `?dated=1` (AC42, AC90). */
export interface MapSearch {
  place?: string
  category?: string
  dated?: 1
}

/** What the screen shows for an address: the chosen category ids, the dated switch, and the address as it should read once cleaned. */
export interface MapFilter {
  chosen: string[]
  datedOnly: boolean
  /** A category slug in the address that no category carries (an empty one too). */
  unknownCategory: boolean
  address: MapSearch
  addressChanged: boolean
}

const SLUG_SEPARATOR = ','

/** Pure: the router also runs it on hover. An empty `category` stays, so the screen can name it; an unknown slug cannot be told here, the categories are not loaded. */
export function validateMapSearch(search: Record<string, unknown>): MapSearch {
  const { place, category, dated } = search
  const slug = typeof category === 'number' ? String(category) : category

  return {
    ...(typeof place === 'string' && place !== '' ? { place } : {}),
    ...(typeof slug === 'string' ? { category: slug } : {}),
    ...(dated === 1 || dated === '1' ? { dated: 1 as const } : {}),
  }
}

/** The address of a choice made in the sheet: the slugs of the chosen categories, and the dated switch. */
export function filterAddress(chosen: readonly string[], categories: readonly PublicCategory[], datedOnly: boolean): MapSearch {
  const slugs = chosen.flatMap(id => categories.find(category => category.id === id)?.slug ?? [])

  return {
    ...(slugs.length > 0 ? { category: slugs.join(SLUG_SEPARATOR) } : {}),
    ...(datedOnly ? { dated: 1 as const } : {}),
  }
}

/**
 * The one rule for an address. A `place` wins: the category and dated filters are cleared and the address loses
 * them, so the list shows every pin (G-S9-D-SMALL). Without one, a slug picks its category (a parent covers its
 * sub-categories, a sub-category slug only itself); slugs no category carries are dropped and flagged.
 */
export function resolveMapFilter(search: MapSearch, categories: readonly PublicCategory[]): MapFilter {
  if (search.place !== undefined) {
    const hasFilter = search.category !== undefined || search.dated !== undefined

    return { chosen: [], datedOnly: false, unknownCategory: false, address: { place: search.place }, addressChanged: hasFilter }
  }

  const slugs = search.category === undefined ? [] : search.category.split(SLUG_SEPARATOR)
  const found = slugs.map(slug => categories.find(category => category.slug === slug))
  const chosen = [...new Set(found.flatMap(category => category?.id ?? []))]
  const unknownCategory = search.category !== undefined && found.includes(undefined)
  const address = filterAddress(chosen, categories, search.dated !== undefined)

  return { chosen, datedOnly: search.dated !== undefined, unknownCategory, address, addressChanged: unknownCategory }
}
