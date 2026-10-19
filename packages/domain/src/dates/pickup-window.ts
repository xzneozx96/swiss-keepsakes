import { addCalendarDays, zurichDate, zurichInstant } from './zurich'

/** The day a pickup is requested for, and the Zurich hours the place is open that day. */
export interface PickupWindow {
  date: string
  /** "HH:mm" Zurich time. */
  from: string
  to: string
}

/** True when `at` falls inside the window: from inclusive, to exclusive. */
export function isWithinPickupWindow(at: Date, window: PickupWindow): boolean {
  const start = zurichInstant(window.date, window.from).getTime()
  const end = zurichInstant(window.date, window.to).getTime()

  return at.getTime() >= start && at.getTime() < end
}

/** True when `date` is on or after the earliest pickup date and not more than `maxDaysAhead` days after `today`. */
export function isPickupDateInRange(
  date: string,
  earliest: string,
  now: Date,
  maxDaysAhead: number,
): boolean {
  return date >= earliest && date <= addCalendarDays(zurichDate(now), maxDaysAhead)
}
