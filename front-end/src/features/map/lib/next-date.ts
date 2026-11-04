import type { NextDate } from '@sk/api-contract'
import type { IntlLocale } from '@sk/domain/shared'

import { formatShortDate } from '@sk/domain/shared'

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
