import type { PublicCategory } from '@sk/api-contract'

/** The address of the guest map: `?place=<pin slug>`, `?category=<slug>[,<slug>]` (AC42, AC90). */
export interface MapSearch {
  place?: string
  category?: string
}

/** An address as it can still arrive: old links carry `?dated=1` (the "places with a date" filter, removed 05.11.2026). It is read only to be cleaned away. */
export type MapAddress = MapSearch & { dated?: 1 }

/** What the screen shows for an address: the chosen category ids and the address as it should read once cleaned. */
export interface MapFilter {
  chosen: string[]
  /** A category slug in the address that no category carries (an empty one too). */
  unknownCategory: boolean
  address: MapSearch
  addressChanged: boolean
}

const SLUG_SEPARATOR = ','

/** Pure: the router also runs it on hover. An empty `category` stays, so the screen can name it; an unknown slug cannot be told here, the categories are not loaded. */
export function validateMapSearch(search: Record<string, unknown>): MapAddress {
  const { place, category, dated } = search
  const slug = typeof category === 'number' ? String(category) : category

  return {
    ...(typeof place === 'string' && place !== '' ? { place } : {}),
    ...(typeof slug === 'string' ? { category: slug } : {}),
    ...(dated === 1 || dated === '1' ? { dated: 1 as const } : {}),
  }
}

/** The address of a choice made in the sheet: the slugs of the chosen categories. */
export function filterAddress(chosen: readonly string[], categories: readonly PublicCategory[]): MapSearch {
  const slugs = chosen.flatMap(id => categories.find(category => category.id === id)?.slug ?? [])

  return {
    ...(slugs.length > 0 ? { category: slugs.join(SLUG_SEPARATOR) } : {}),
  }
}

/**
 * The one rule for an address. A `place` wins: the category filter is cleared and the address loses
 * it, so the list shows every pin (G-S9-D-SMALL). A legacy `dated` is never applied; it only marks the address as changed, so it is cleaned. Without one, a slug picks its category (a parent covers its
 * sub-categories, a sub-category slug only itself); slugs no category carries are dropped and flagged.
 */
export function resolveMapFilter(search: MapAddress, categories: readonly PublicCategory[]): MapFilter {
  if (search.place !== undefined) {
    const hasFilter = search.category !== undefined || search.dated !== undefined

    return { chosen: [], unknownCategory: false, address: { place: search.place }, addressChanged: hasFilter }
  }

  const slugs = search.category === undefined ? [] : search.category.split(SLUG_SEPARATOR)
  const found = slugs.map(slug => categories.find(category => category.slug === slug))
  const chosen = [...new Set(found.flatMap(category => category?.id ?? []))]
  const unknownCategory = search.category !== undefined && found.includes(undefined)
  const address = filterAddress(chosen, categories)

  return { chosen, unknownCategory, address, addressChanged: unknownCategory || search.dated !== undefined }
}
