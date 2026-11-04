import type { PublicStoryCard } from '@sk/api-contract'
import type { InterestCode, RankPrefs } from '@sk/domain/content'

import { interestCodes, rankItems } from '@sk/domain/content'

const isInterest = (value: string): value is InterestCode => (interestCodes as readonly string[]).includes(value)

/**
 * The cards in the order a guest's answers give (ADR-006): the stay fit first, then more matching interests, then the
 * server order. Drops nothing. The server sends them newest first, and that stays the order of equal fits.
 */
export function rankStories(cards: readonly PublicStoryCard[], prefs: RankPrefs): PublicStoryCard[] {
  const items = cards.map(card => ({ card, stay: card.stayTag, interests: card.interests.filter(isInterest) }))

  return rankItems(items, prefs).map(item => item.card)
}
