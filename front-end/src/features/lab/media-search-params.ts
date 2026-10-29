/** What `/lab/media` reads from its address. Pure, so the route's `validateSearch` stays light. */

export const stateIds = ['normal', 'loading', 'empty', 'nomatch', 'upload', 'refused'] as const
export const widthIds = ['desktop', 'phone'] as const

export type LabState = (typeof stateIds)[number]
export type LabWidth = (typeof widthIds)[number]

export interface MediaLabSearch {
  /** 1 inside the frame: render only the dashboard. */
  embed: 0 | 1
  state: LabState
  width: LabWidth
}

function pick<T extends string | number>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

export function parseMediaLabSearch(search: Record<string, unknown>): MediaLabSearch {
  return {
    embed: pick(search.embed, [0, 1] as const, 0),
    state: pick(search.state, stateIds, 'normal'),
    width: pick(search.width, widthIds, 'desktop'),
  }
}
