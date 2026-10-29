/** What `/lab/story-editor` reads from its address. Pure, so the route's `validateSearch` stays light. */

export const stateIds = ['draft', 'new', 'typing', 'media', 'pinpicker', 'publish', 'blocked', 'reviewtype', 'categories', 'loading', 'unsaved', 'de'] as const
export const widthIds = ['desktop', 'phone'] as const

export type LabState = (typeof stateIds)[number]
export type LabWidth = (typeof widthIds)[number]

export interface StoryLabSearch {
  /** 1 inside the frame: render only the editor. */
  embed: 0 | 1
  state: LabState
  width: LabWidth
}

function pick<T extends string | number>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

export function parseStoryLabSearch(search: Record<string, unknown>): StoryLabSearch {
  return {
    embed: pick(search.embed, [0, 1] as const, 0),
    state: pick(search.state, stateIds, 'draft'),
    width: pick(search.width, widthIds, 'desktop'),
  }
}
