import type { InterestCode, StayTag } from './localized.ts'

import { interestCodes } from './localized.ts'

export interface RankItem {
  stay: StayTag
  interests: readonly InterestCode[]
}

/** The stay a guest answers with: a stay tag without `both`. */
export type StayChoice = Exclude<StayTag, 'both'>

export interface RankPrefs {
  stay?: StayChoice | null
  interests?: readonly InterestCode[]
}

/**
 * Orders items for a guest: the items that fit the stay first (a `both` tag fits either),
 * then the items that match more of the chosen interests, then the input order.
 * Pure and stable. Returns a new array and drops nothing, so a worse fit sinks and is never hidden.
 */
export function rankItems<T extends RankItem>(items: readonly T[], prefs: RankPrefs): T[] {
  const chosen = new Set<InterestCode>(prefs.interests ?? [])
  const keyed = items.map((item, index) => ({
    item,
    index,
    level: !prefs.stay || item.stay === 'both' || item.stay === prefs.stay ? 0 : 1,
    matches: item.interests.filter(interest => chosen.has(interest)).length,
  }))

  keyed.sort((a, b) => a.level - b.level || b.matches - a.matches || a.index - b.index)

  return keyed.map(entry => entry.item)
}

/** Whether a stored or sent value is one of the closed interest codes. */
export function isInterestCode(value: unknown): value is InterestCode {
  return typeof value === 'string' && (interestCodes as readonly string[]).includes(value)
}

/**
 * `rankItems` for anything the API sends with a stay tag and interest strings (pins, story cards): an interest outside
 * the closed list counts for nothing. The items come back as they went in, in the guest's order.
 */
export function rankByTags<T extends { stayTag: StayTag, interests: readonly string[] }>(items: readonly T[], prefs: RankPrefs): T[] {
  const entries = items.map(item => ({ item, stay: item.stayTag, interests: item.interests.filter(isInterestCode) }))

  return rankItems(entries, prefs).map(entry => entry.item)
}
