import { zurichDate } from '@sk/domain/catalog'
import { addCalendarDays } from '@sk/domain/dates'
import { calendarDay, dateTimeFormat } from '@sk/domain/shared'

/** One weekly span of a pickup point as the public read sends it: weekday 1 (Monday) to 7, `HH:MM`, closes `24:00` or before opens for the next morning. */
export interface PickupSpan { weekday: number, opens: string, closes: string }

/** The calendar covers today and the next 60 days. */
export const PICKUP_WINDOW_DAYS = 60

/** Monday is 1 and Sunday is 7, the way hours are stored. */
function weekdayOf(isoDate: string): number {
  return calendarDay(isoDate).getUTCDay() || 7
}

/** The time on the Zurich wall clock as `HH:MM`. */
function zurichTime(at: Date): string {
  return dateTimeFormat('en-GB', { timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(at)
}

/** A span that closes before it opens runs into the next morning, so it cannot have ended on its own day. */
const endsOnItsDay = (span: PickupSpan) => span.closes > span.opens

/**
 * Whether a guest can ask to collect on `isoDate` (a Zurich day): the point has a span that starts on that weekday (a
 * span past midnight belongs to the day it starts), the day is within the 60-day window, and, for today, some span that
 * starts today has not ended yet. No preparation time (O22 is open): E7.21 adds it on top.
 */
export function isPickupDay(hours: readonly PickupSpan[], isoDate: string, now: Date): boolean {
  const today = zurichDate(now)

  if (isoDate < today || isoDate > addCalendarDays(today, PICKUP_WINDOW_DAYS))
    return false

  const weekday = weekdayOf(isoDate)
  const spans = hours.filter(span => span.weekday === weekday)

  if (isoDate !== today)
    return spans.length > 0

  const time = zurichTime(now)

  return spans.some(span => endsOnItsDay(span) ? time < span.closes : true)
}

/** Whether the point has a span that starts on the weekday of `isoDate`, whatever the time now. */
export function opensOnWeekday(hours: readonly PickupSpan[], isoDate: string): boolean {
  const weekday = weekdayOf(isoDate)

  return hours.some(span => span.weekday === weekday)
}

/** The first day the point can be picked from now, or undefined when it has none in the window. */
export function earliestPickupDay(hours: readonly PickupSpan[], now: Date): string | undefined {
  const today = zurichDate(now)

  for (let offset = 0; offset <= PICKUP_WINDOW_DAYS; offset += 1) {
    const day = addCalendarDays(today, offset)

    if (isPickupDay(hours, day, now))
      return day
  }

  return undefined
}
