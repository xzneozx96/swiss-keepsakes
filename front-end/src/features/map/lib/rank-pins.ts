import type { PublicMapItem } from '@sk/api-contract'
import type { InterestCode, RankPrefs } from '@sk/domain/content'

import { interestCodes, rankItems } from '@sk/domain/content'

const isInterest = (value: string): value is InterestCode => (interestCodes as readonly string[]).includes(value)

/**
 * The pins in the order a guest's answers give (ADR-006): the stay fit first, then more matching interests, then the
 * server order. Drops nothing, so a worse fit sinks on the map's list and card row and is never hidden.
 */
export function rankPins(pins: readonly PublicMapItem[], prefs: RankPrefs): PublicMapItem[] {
  const items = pins.map(pin => ({ pin, stay: pin.stayTag, interests: pin.interests.filter(isInterest) }))

  return rankItems(items, prefs).map(item => item.pin)
}
