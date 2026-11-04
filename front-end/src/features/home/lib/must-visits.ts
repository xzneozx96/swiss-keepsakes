import type { PublicMapItem } from '@sk/api-contract'
import type { RankPrefs } from '@sk/domain/content'

import { rankByTags } from '@sk/domain/content'

/** The pins the merchant flagged as must-visit, in the server's order. */
export function mustVisitsOf(pins: readonly PublicMapItem[]): PublicMapItem[] {
  return pins.filter(pin => pin.mustVisit)
}

/**
 * The postcards in the guest's order (docs/ux/home-design.md section 2): more matching interests first, then the stay fit,
 * then the server order. `rankByTags` puts the stay first, so it runs twice: the stay first, then the interests, which keep
 * that order inside a tie. Drops nothing.
 */
export function mustVisitOrder(pins: readonly PublicMapItem[], prefs: RankPrefs): PublicMapItem[] {
  return rankByTags(rankByTags(pins, { stay: prefs.stay }), { interests: prefs.interests })
}
