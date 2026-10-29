/** What `/lab/categories` reads from its address. Pure, so the route's `validateSearch` stays light. */

export const categoryKindIds = ['map', 'blog'] as const
/**
 * The state a frame opens in: the list, a category's page (phones), the add/edit sheet, or a
 * refused delete.
 */
export const categoryStateIds = ['list', 'page', 'edit', 'add', 'refused'] as const

export type CategoryKind = (typeof categoryKindIds)[number]
export type CategoryLabState = (typeof categoryStateIds)[number]

export interface CategoriesLabSearch {
  /** 1 inside a frame: only the screen, without the lab toolbar. */
  embed: 0 | 1
  kind: CategoryKind
  state: CategoryLabState
}

function pick<T extends string | number>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

export function parseCategoriesLabSearch(search: Record<string, unknown>): CategoriesLabSearch {
  return {
    embed: pick(search.embed, [0, 1] as const, 0),
    kind: pick(search.kind, categoryKindIds, 'map'),
    state: pick(search.state, categoryStateIds, 'list'),
  }
}
