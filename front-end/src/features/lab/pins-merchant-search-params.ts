/** What `/lab/pins` reads from its address. Pure, so the route's `validateSearch` stays light. */

export const screenIds = ['list', 'editor'] as const
export const listStateIds = ['normal', 'loading', 'empty', 'nomatch'] as const
export const optionIds = ['S', 'A', 'B', 'C'] as const
export const scenarioIds = [
  'new-place',
  'new-event',
  'published',
  'hidden',
  'ended',
  'draft-errors',
] as const
export const widthIds = ['desktop', 'phone'] as const

export type LabScreen = (typeof screenIds)[number]
export type ListState = (typeof listStateIds)[number]
export type EditorOption = (typeof optionIds)[number]
export type Scenario = (typeof scenarioIds)[number]
export type LabWidth = (typeof widthIds)[number]

export interface PinsLabSearch {
  /** 1 inside the frame: render only the dashboard, without the lab controls. */
  embed: 0 | 1
  screen: LabScreen
  list: ListState
  option: EditorOption
  scenario: Scenario
  width: LabWidth
}

function pick<T extends string | number>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

export function parsePinsLabSearch(search: Record<string, unknown>): PinsLabSearch {
  return {
    embed: pick(search.embed, [0, 1] as const, 0),
    screen: pick(search.screen, screenIds, 'list'),
    list: pick(search.list, listStateIds, 'normal'),
    option: pick(search.option, optionIds, 'S'),
    scenario: pick(search.scenario, scenarioIds, 'published'),
    width: pick(search.width, widthIds, 'desktop'),
  }
}
