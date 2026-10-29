import type { PinDate } from './pin.ts'

const zurichClock = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Zurich',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function zurichNow(now: Date): { day: string, time: string } {
  const p: Record<string, string> = {}

  for (const { type, value } of zurichClock.formatToParts(now))
    p[type] = value

  return { day: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` }
}

/** A date ends at lastDay plus endTime, or 24:00 without one; ended when Zurich local now is at or after that. */
export function hasEnded(date: Pick<PinDate, 'lastDay' | 'endTime'>, now: Date): boolean {
  const local = zurichNow(now)

  if (local.day !== date.lastDay)
    return local.day > date.lastDay

  return date.endTime !== null && local.time >= date.endTime.slice(0, 5)
}

function byStart(a: PinDate, b: PinDate): number {
  if (a.firstDay !== b.firstDay)
    return a.firstDay < b.firstDay ? -1 : 1
  if (a.startTime === b.startTime)
    return 0
  if (a.startTime === null)
    return -1
  if (b.startTime === null)
    return 1

  return a.startTime < b.startTime ? -1 : 1
}

/** The next date that has not ended, `null` for a pin with no dates, `'ended'` when every date is over. */
export function nextDate(dates: PinDate[], now: Date): PinDate | null | 'ended' {
  if (dates.length === 0)
    return null

  const upcoming = dates.filter(date => !hasEnded(date, now)).sort(byStart)

  return upcoming[0] ?? 'ended'
}

/** What the merchant list shows: a published pin whose dates are all over is `ended` and is off the guests' map (AC86). */
export function pinListStatus(pin: { status: 'draft' | 'published' | 'hidden', dates: PinDate[] }, now: Date): 'draft' | 'published' | 'hidden' | 'ended' {
  if (pin.status === 'published' && nextDate(pin.dates, now) === 'ended')
    return 'ended'

  return pin.status
}
