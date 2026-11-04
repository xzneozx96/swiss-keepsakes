import type { InterestCode, StayTag } from './localized.ts'

export interface RankItem {
  stay: StayTag
  interests: readonly InterestCode[]
}

export interface RankPrefs {
  stay?: Exclude<StayTag, 'both'> | null
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
