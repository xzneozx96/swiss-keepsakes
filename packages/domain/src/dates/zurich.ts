const DAY_MS = 86_400_000
const HOUR_MS = 3_600_000
const TIME = /^(\d{2}):(\d{2})$/

/** Day of month (1-31) of the last Sunday of a month; `month` is 1-12. */
function lastSunday(year: number, month: number): number {
  const last = new Date(Date.UTC(year, month, 0))

  return last.getUTCDate() - last.getUTCDay()
}

/**
 * Central European Time is UTC+1; summer time (UTC+2) runs from 01:00 UTC on the last Sunday
 * of March to 01:00 UTC on the last Sunday of October. Manual rules, so no system timezone
 * or Intl data is read.
 */
function isSummerTime(ms: number): boolean {
  const year = new Date(ms).getUTCFullYear()
  const start = Date.UTC(year, 2, lastSunday(year, 3), 1)
  const end = Date.UTC(year, 9, lastSunday(year, 10), 1)

  return ms >= start && ms < end
}

/** Zurich's offset from UTC at an instant, in minutes: 60 in winter, 120 in summer. */
export function zurichOffsetMinutes(at: Date): number {
  return isSummerTime(at.getTime()) ? 120 : 60
}

/** Calendar date in Europe/Zurich as YYYY-MM-DD (the business time zone). */
export function zurichDate(at: Date): string {
  const shifted = new Date(at.getTime() + zurichOffsetMinutes(at) * 60_000)

  return shifted.toISOString().slice(0, 10)
}

/** Moves a YYYY-MM-DD date by whole calendar days. */
export function addCalendarDays(isoDate: string, days: number): string {
  return new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10)
}

/**
 * The instant at which Zurich's wall clock reads `time` ("HH:mm") on `isoDate`. A time inside
 * the spring gap (02:00 to 03:00) does not exist and is read as the time before the change;
 * a time inside the autumn overlap is the first (summer) occurrence.
 */
export function zurichInstant(isoDate: string, time: string): Date {
  const match = TIME.exec(time)

  if (!match)
    throw new RangeError(`Expected HH:mm, got "${time}"`)

  const wall = Date.parse(`${isoDate}T${time}:00Z`)

  if (Number.isNaN(wall))
    throw new RangeError(`Expected YYYY-MM-DD, got "${isoDate}"`)

  const summer = new Date(wall - 2 * HOUR_MS)

  if (zurichOffsetMinutes(summer) === 120)
    return summer

  return new Date(wall - HOUR_MS)
}
