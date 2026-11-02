import type { IntlLocale } from '@sk/domain/shared'

import { dateTimeFormat } from '@sk/domain/shared'

export interface HoursSpan { day: number, opens: string, closes: string }

const DAYS = [1, 2, 3, 4, 5, 6, 7] as const
const SHORT_WEEKDAY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Today's weekday in the shop's time zone, Monday as 1 (the way hours are stored, ADR-029). */
export function zurichWeekday(now: Date) {
  const name = dateTimeFormat('en-US', { timeZone: 'Europe/Zurich', weekday: 'short' }).format(now)

  return SHORT_WEEKDAY.indexOf(name) + 1
}

function weekdayName(day: number, locale: IntlLocale) {
  // Monday 26 October 2026 plus the day: 1 to 7 fall on real dates.
  return dateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 9, 25 + day)))
}

const hhmm = (time: string) => time.slice(0, 5)

/**
 * The week in a few lines: days in a row with the same hours share one line ("Mon–Fri"), the line that holds today is
 * marked, and `openToday` says whether today has any span. No hours at all gives no groups.
 */
export function hoursOfWeek(spans: readonly HoursSpan[], today: number, locale: IntlLocale, closedText: string) {
  if (spans.length === 0)
    return { groups: [], openToday: false }

  const groups: { first: number, last: number, value: string, today: boolean, closed: boolean }[] = []

  for (const day of DAYS) {
    const own = spans.filter(span => span.day === day).sort((a, b) => a.opens.localeCompare(b.opens))
    const value = own.length > 0 ? own.map(span => `${hhmm(span.opens)}–${hhmm(span.closes)}`).join(', ') : closedText
    const previous = groups.at(-1)

    if (previous && previous.value === value && previous.last === day - 1) {
      previous.last = day
      previous.today ||= day === today
    }
    else {
      groups.push({ first: day, last: day, value, today: day === today, closed: own.length === 0 })
    }
  }

  return {
    groups: groups.map(group => ({
      days: group.first === group.last ? weekdayName(group.first, locale) : `${weekdayName(group.first, locale)}–${weekdayName(group.last, locale)}`,
      value: group.value,
      today: group.today,
      closed: group.closed,
    })),
    openToday: spans.some(span => span.day === today),
  }
}
