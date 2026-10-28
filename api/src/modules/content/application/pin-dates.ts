import type { PinDate } from '@sk/domain/content'

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

// A date ends at lastDay plus endTime, or 24:00 without one; ended when Zurich local now is at or after that.
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

export function nextDate(dates: PinDate[], now: Date): PinDate | null | 'ended' {
  if (dates.length === 0)
    return null

  const upcoming = dates.filter(date => !hasEnded(date, now)).sort(byStart)

  return upcoming[0] ?? 'ended'
}

// Each category plus its parent, once, sorted.
export function withParents(categoryIds: string[], parentOf: ReadonlyMap<string, string | null>): string[] {
  const all = new Set(categoryIds)

  for (const id of categoryIds) {
    const parent = parentOf.get(id)

    if (parent)
      all.add(parent)
  }

  return [...all].sort()
}
