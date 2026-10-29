import type { NextDate } from '@sk/api-contract'
import type { IntlLocale } from '@sk/domain/shared'

import { dateTimeFormat, formatShortDate } from '@sk/domain/shared'

const SHOP_ZONE = 'Europe/Zurich'

/** Today's calendar day (YYYY-MM-DD) in the shop's time zone. */
export function zurichToday(now: Date) {
  return dateTimeFormat('en-CA', { timeZone: SHOP_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

const hhmm = (time: string) => time.slice(0, 5)

/** The next date of a pin for its card: a day with its times, a range, or "until" for a range already running. */
export function nextDateLine(
  next: NextDate,
  today: string,
  locale: IntlLocale,
  copy: { until: (day: string) => string, from: (time: string) => string },
) {
  const first = formatShortDate(next.firstDay, today, locale)

  if (next.firstDay !== next.lastDay) {
    const last = formatShortDate(next.lastDay, today, locale)

    return next.firstDay <= today ? copy.until(last) : `${first} – ${last}`
  }
  if (!next.startTime)
    return first

  return `${first}, ${next.endTime ? `${hhmm(next.startTime)}–${hhmm(next.endTime)}` : copy.from(hhmm(next.startTime))}`
}
