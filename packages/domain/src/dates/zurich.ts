const DAY_MS = 86_400_000
const HOUR_MS = 3_600_000
const TIME = /^(\d{2}):(\d{2})$/

/** The explicit zone makes the result independent of the machine's own time zone; the tz database supplies the daylight-saving rules. */
const wallClock = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Zurich',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

const dayClock = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Zurich',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function wallParts(at: Date): Record<string, string> {
  const parts: Record<string, string> = {}

  for (const { type, value } of wallClock.formatToParts(at))
    parts[type] = value

  return parts
}

/** Zurich's offset from UTC at an instant, in minutes: 60 in winter, 120 in summer. */
export function zurichOffsetMinutes(at: Date): number {
  const p = wallParts(at)
  const wall = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second)

  return Math.round((wall - Math.floor(at.getTime() / 1000) * 1000) / 60_000)
}

/** Calendar date in Europe/Zurich as YYYY-MM-DD (the business time zone). */
export function zurichDate(at: Date): string {
  return dayClock.format(at)
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
