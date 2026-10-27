import type { IntlLocale } from '@sk/domain/shared'

import { calendarDay, dateTimeFormat } from '@sk/domain/shared'

const DAY = { day: '2-digit', month: '2-digit', year: 'numeric' } as const

/**
 * A `YYYY-MM-DD` calendar day (a Zurich day) as "30.09.2026". It is read as a plain date, so the server and
 * a browser in any time zone print the same day.
 */
export function formatCalendarDay(isoDate: string, locale: IntlLocale): string {
  return dateTimeFormat(locale, { ...DAY, timeZone: 'UTC' }).format(calendarDay(isoDate))
}

/** The Zurich calendar day of an instant (ISO string with an offset or Z), the same in every browser and on the server. */
export function formatZurichInstant(iso: string, locale: IntlLocale): string {
  return dateTimeFormat(locale, { ...DAY, timeZone: 'Europe/Zurich' }).format(new Date(iso))
}
