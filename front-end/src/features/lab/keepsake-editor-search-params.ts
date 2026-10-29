/** What `/lab/keepsake-editor` reads from its address. Pure, so the route's `validateSearch` stays light. */

export const stateIds = [
  'products',
  'product',
  'unsaved',
  'newoption',
  'inuse',
  'duplicate',
  'review',
  'blocked',
  'create-details',
  'create-options',
  'create-variants',
  'create-stock',
  'variant',
  'inventory',
  'item',
  'belowheld',
  'loading',
] as const
export const widthIds = ['desktop', 'phone'] as const

export type LabState = (typeof stateIds)[number]
export type LabWidth = (typeof widthIds)[number]

export interface KeepsakeLabSearch {
  /** 1 inside the frame: render only the merchant screens. */
  embed: 0 | 1
  state: LabState
  width: LabWidth
}

function pick<T extends string | number>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

export function parseKeepsakeLabSearch(search: Record<string, unknown>): KeepsakeLabSearch {
  return {
    embed: pick(search.embed, [0, 1] as const, 0),
    state: pick(search.state, stateIds, 'product'),
    width: pick(search.width, widthIds, 'desktop'),
  }
}
