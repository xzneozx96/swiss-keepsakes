import { interestCodes } from '@sk/domain/content'

export type HomeSectionKey = 'must-visits' | 'stories' | 'routes' | 'food-map' | 'events' | 'victorinox'

/** The movable sections in their default order, and the interest each one answers. The stories answer none, so they never move up. */
const SECTIONS: readonly { key: HomeSectionKey, interest: (typeof interestCodes)[number] | null }[] = [
  { key: 'must-visits', interest: 'history-culture' },
  { key: 'stories', interest: null },
  { key: 'routes', interest: 'lake-mountains' },
  { key: 'food-map', interest: 'food-drink' },
  { key: 'events', interest: 'local-activities' },
  { key: 'victorinox', interest: 'shopping-keepsakes' },
]

/**
 * The order of the movable home sections (decision 2026-10-28-home-local-briefing, amendment 05.11.2026). The sections whose
 * interest the guest chose come first, in the canonical interest order. The others follow in the default order. With no answers
 * this is the default order. Nothing is dropped.
 */
export function homeSectionOrder(interests: readonly string[]): HomeSectionKey[] {
  const matched = interestCodes
    .filter(code => interests.includes(code))
    .map(code => SECTIONS.find(section => section.interest === code))
    .filter(section => section !== undefined)
  const rest = SECTIONS.filter(section => !matched.includes(section))

  return [...matched, ...rest].map(section => section.key)
}
