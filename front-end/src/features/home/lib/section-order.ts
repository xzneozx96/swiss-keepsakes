import { interestCodes } from '@sk/domain/content'

export type HomeSectionKey = 'must-visits' | 'stories' | 'routes' | 'food-map' | 'events' | 'victorinox'

type Interest = (typeof interestCodes)[number]

/**
 * The movable units in their default order, and the interests each answers. "See these first" and "Walk it the way we would"
 * are one unit: the must-visit spots, then the routes that walk them (owner, 05.11.2026). They always come together, the spots
 * first, and the unit moves up for either interest. The stories answer none, so they never move up.
 */
const UNITS: readonly { keys: readonly HomeSectionKey[], interests: readonly Interest[] }[] = [
  { keys: ['must-visits', 'routes'], interests: ['history-culture', 'lake-mountains'] },
  { keys: ['stories'], interests: [] },
  { keys: ['food-map'], interests: ['food-drink'] },
  { keys: ['events'], interests: ['local-activities'] },
  { keys: ['victorinox'], interests: ['shopping-keepsakes'] },
]

/**
 * The order of the movable home sections (decision 2026-10-28-home-local-briefing, amendment 05.11.2026). The units whose
 * interest the guest chose come first, in the canonical interest order (a unit takes the place of its first chosen interest).
 * The others follow in the default order. With no answers this is the default order. Nothing is dropped.
 */
export function homeSectionOrder(interests: readonly string[]): HomeSectionKey[] {
  const matched = [...new Set(interestCodes
    .filter(code => interests.includes(code))
    .map(code => UNITS.find(unit => unit.interests.includes(code)))
    .filter(unit => unit !== undefined))]
  const rest = UNITS.filter(unit => !matched.includes(unit))

  return [...matched, ...rest].flatMap(unit => unit.keys)
}
