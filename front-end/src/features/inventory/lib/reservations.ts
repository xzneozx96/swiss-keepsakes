import type { IntlLocale } from '@sk/domain/shared'

import { dateTimeFormat, formatShortDate } from '@sk/domain/shared'

/** The Zurich calendar day (YYYY-MM-DD) of a moment: the Swedish format is the ISO one. */
const zurichDay = (moment: Date) => dateTimeFormat('sv-SE', { timeZone: 'Europe/Zurich' }).format(moment)

/** The day an order was accepted as the shop's cards write a date: "Wed 28 Oct", with the year when it is not this one. */
export function acceptedDate(acceptedAt: string, locale: IntlLocale, now = new Date()): string {
  return formatShortDate(zurichDay(new Date(acceptedAt)), zurichDay(now), locale)
}
