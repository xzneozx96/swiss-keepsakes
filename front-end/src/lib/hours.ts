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

/** A span whose closing time is before its opening time closes the next morning (ADR-029); 24:00 is midnight. */
const endsNextDay = (span: HoursSpan) => hhmm(span.closes) < hhmm(span.opens)

/** The day before, Sunday wrapping to Monday. */
const dayBefore = (day: number) => (day === 1 ? 7 : day - 1)

/**
 * Whether the place is open at `time` (`HH:MM`) on `day`: a span that started today and has not closed, or the
 * previous day's span that runs past midnight and has not closed yet.
 */
export function isOpenAt(spans: readonly HoursSpan[], day: number, time: string) {
  return spans.some((span) => {
    const opens = hhmm(span.opens)
    const closes = hhmm(span.closes)

    if (span.day === day)
      return endsNextDay(span) ? time >= opens : time >= opens && time < closes

    return span.day === dayBefore(day) && endsNextDay(span) && time < closes
  })
}

/**
 * The week in a few lines: days in a row with the same hours share one line ("Mon–Fri"), the line that holds today is
 * marked, and `openToday` says whether the place is open at some point today. No hours at all gives no groups. Two spans
 * of one day are joined by `separator` (", " in the place sheet).
 */
export function hoursOfWeek(spans: readonly HoursSpan[], today: number, locale: IntlLocale, closedText: string, separator = ', ') {
  if (spans.length === 0)
    return { groups: [], openToday: false }

  const groups: { first: number, last: number, value: string, today: boolean, closed: boolean }[] = []

  for (const day of DAYS) {
    const own = spans.filter(span => span.day === day).sort((a, b) => a.opens.localeCompare(b.opens))
    const value = own.length > 0 ? own.map(span => `${hhmm(span.opens)}–${hhmm(span.closes)}`).join(separator) : closedText
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
    // Open at some point today: a span that starts today, or yesterday's that runs past midnight into the morning.
    openToday: spans.some(span => span.day === today || (span.day === dayBefore(today) && endsNextDay(span))),
  }
}
