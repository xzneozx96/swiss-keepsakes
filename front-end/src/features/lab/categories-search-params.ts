/** What `/lab/categories` reads from its address. Pure, so the route's `validateSearch` stays light. */

export const categoryOptionIds = ['A', 'B', 'C'] as const
export const categoryKindIds = ['map', 'blog'] as const
/** The state a frame opens in: the list, the add/edit form, or a refused delete. */
export const categoryStateIds = ['list', 'edit', 'refused'] as const
export const categoryWidthIds = ['phone', 'desktop'] as const

export type CategoryOption = (typeof categoryOptionIds)[number]
export type CategoryKind = (typeof categoryKindIds)[number]
export type CategoryLabState = (typeof categoryStateIds)[number]
export type CategoryLabWidth = (typeof categoryWidthIds)[number]

export interface CategoriesLabSearch {
  /** 1 inside a frame: only the screen, without the lab toolbar. */
  embed: 0 | 1
  option: CategoryOption
  kind: CategoryKind
  state: CategoryLabState
  width: CategoryLabWidth
}

function pick<T extends string | number>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

export function parseCategoriesLabSearch(search: Record<string, unknown>): CategoriesLabSearch {
  return {
    embed: pick(search.embed, [0, 1] as const, 0),
    option: pick(search.option, categoryOptionIds, 'A'),
    kind: pick(search.kind, categoryKindIds, 'map'),
    state: pick(search.state, categoryStateIds, 'list'),
    width: pick(search.width, categoryWidthIds, 'phone'),
  }
}
