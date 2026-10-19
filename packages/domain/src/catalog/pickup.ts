import type { DayMode, Product } from './types'

import { zurichDate } from '../dates/zurich'
import { calendarDay } from '../shared/format'

export { zurichDate }

const dayCache = new Map<string, string>()

/** zurichDate of an ISO timestamp, cached: analytics ask for the same instants many times. */
export function zurichDayOf(iso: string): string {
  let day = dayCache.get(iso)

  if (!day) {
    day = zurichDate(new Date(iso))
    dayCache.set(iso, day)
  }

  return day
}

function addDays(isoDate: string, days: number): string {
  const d = calendarDay(isoDate)

  d.setUTCDate(d.getUTCDate() + days)

  return d.toISOString().slice(0, 10)
}

function weekday(isoDate: string): number {
  return calendarDay(isoDate).getUTCDay()
}

function isWeekend(isoDate: string): boolean {
  const day = weekday(isoDate)

  return day === 0 || day === 6
}

/**
 * Both pickup places are closed on Sundays (their opening hours are Mon–Sat), so no
 * Sunday can be requested. One shop-wide rule until places get their own opening days.
 */
export function isPickupClosed(isoDate: string): boolean {
  return weekday(isoDate) === 0
}

/**
 * Earliest pickup date for a request made at `requestedAt` (decision D9: preparation
 * counts from the request date). Working-day products skip Saturdays and Sundays;
 * public holidays are not skipped (PRD §7.2). A result on a closed day moves to the next
 * open day. The seller re-checks the date on acceptance.
 */
export function earliestPickupDate(
  preparationDays: number,
  dayMode: DayMode,
  requestedAt: Date,
): string {
  let date = zurichDate(requestedAt)
  let remaining = preparationDays

  while (remaining > 0) {
    date = addDays(date, 1)
    if (dayMode === 'calendar-days' || !isWeekend(date))
      remaining -= 1
  }

  while (isPickupClosed(date)) date = addDays(date, 1)

  return date
}

export function productEarliestPickup(
  product: Product,
  requestedAt: Date,
): string {
  return earliestPickupDate(
    product.preparationDays,
    product.dayMode,
    requestedAt,
  )
}
