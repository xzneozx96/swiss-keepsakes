import type { NextDate, PublicMapItem } from '@sk/api-contract'
import type { IntlLocale } from '@sk/domain/shared'

import { dateTimeFormat } from '@sk/domain/shared'

import { nextDateLine, zurichToday } from '@/features/map/lib/next-date'

const SHOP_ZONE = 'Europe/Zurich'
/** An event whose first day is no more than this many days after today is "This week". */
const WEEK_DAYS = 7
/** "Coming up" lists at most this many later events. */
const COMING_UP_MAX = 3

/** A pin that has a next date; the split keeps only these. */
export type EventPin = PublicMapItem & { nextDate: NextDate }

export interface EventsSplit {
  /** Running today, or starting within 7 days, by first day. */
  thisWeek: EventPin[]
  /** Later events by first day, at most 3. */
  comingUp: EventPin[]
  /** More than 3 later events exist: "See all on the map" shows. */
  seeAll: boolean
}

const hhmm = (time: string) => time.slice(0, 5)

/** The calendar day `days` after an ISO day (YYYY-MM-DD), by UTC arithmetic so no time zone shifts it. */
function addDays(isoDay: string, days: number) {
  const date = new Date(`${isoDay}T00:00:00Z`)

  date.setUTCDate(date.getUTCDate() + days)

  return date.toISOString().slice(0, 10)
}

/** The wall-clock time (HH:mm) in the shop's zone. */
function zurichTime(now: Date) {
  return dateTimeFormat('en-GB', { timeZone: SHOP_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now)
}

/**
 * Whether the event is over. Its last day is before today, or it is today and its end time has been reached. The end time
 * is only read on the last day; a pin with a start time and no end time runs to the end of its last day.
 */
function hasEnded(next: NextDate, today: string, time: string) {
  if (next.lastDay !== today)
    return next.lastDay < today

  return next.endTime !== null && hhmm(next.endTime) <= time
}

/**
 * Splits the dated pins of the public map list into "This week" and "Coming up" at the given moment, in Europe/Zurich.
 * An ended event is dropped here, so a cached list never shows one. Pins without a next date are not events.
 */
export function eventsSplit(pins: readonly PublicMapItem[], now: Date): EventsSplit {
  const today = zurichToday(now)
  const time = zurichTime(now)
  const weekEnd = addDays(today, WEEK_DAYS)
  const live = pins
    .filter((pin): pin is EventPin => pin.nextDate !== null && !hasEnded(pin.nextDate, today, time))
    .sort((a, b) => a.nextDate.firstDay.localeCompare(b.nextDate.firstDay))
  const later = live.filter(pin => pin.nextDate.firstDay > weekEnd)

  return {
    thisWeek: live.filter(pin => pin.nextDate.firstDay <= weekEnd),
    comingUp: later.slice(0, COMING_UP_MAX),
    seeAll: later.length > COMING_UP_MAX,
  }
}

/** The day a card puts first: the first day, or today for an event already running. */
export const shownDay = (next: NextDate, today: string) => next.firstDay < today ? today : next.firstDay

/** The day number, weekday and month of an ISO day, for the poster, the timeline and its month markers. */
export function dayParts(isoDay: string, locale: IntlLocale) {
  const date = new Date(`${isoDay}T00:00:00Z`)
  const part = (options: Intl.DateTimeFormatOptions) => dateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(date)

  return {
    day: part({ day: 'numeric' }),
    weekdayShort: part({ weekday: 'short' }),
    weekdayLong: part({ weekday: 'long' }),
    monthShort: part({ month: 'short' }),
    monthLong: part({ month: 'long' }),
  }
}

/** The line under a title: the times of a one-day event, or the range of a longer one ("Until 6 Nov"); nothing when there is neither. */
export function whenLine(
  next: NextDate,
  today: string,
  locale: IntlLocale,
  copy: { until: (day: string) => string, from: (time: string) => string },
) {
  if (next.firstDay !== next.lastDay)
    return nextDateLine(next, today, locale, copy)
  if (!next.startTime)
    return undefined

  return next.endTime ? `${hhmm(next.startTime)}–${hhmm(next.endTime)}` : copy.from(hhmm(next.startTime))
}
