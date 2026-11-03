import type { HoursSpan } from '@/features/places/lib/form'

/** Days are 1 (Mon) to 7 (Sun), as the places editor writes them. */
export const DAYS = [1, 2, 3, 4, 5, 6, 7] as const

let seed = 0

export function span(day: number, opens: string, closes: string): HoursSpan {
  seed += 1

  return { key: `lab-hours-${seed}`, day, opens, closes }
}

/** The one sample week every option starts from. */
export function sampleWeek(): HoursSpan[] {
  return [
    span(1, '09:00', '18:00'),
    span(2, '09:00', '18:00'),
    span(3, '09:00', '12:00'),
    span(3, '13:30', '18:00'),
    span(4, '09:00', '18:00'),
    span(5, '09:00', '18:00'),
    span(6, '10:00', '16:00'),
  ]
}

export function minutesOf(time: string) {
  const [h = 0, m = 0] = time.split(':').map(Number)

  return h * 60 + m
}

export function timeOf(minutes: number) {
  const m = Math.max(0, Math.min(24 * 60, minutes))

  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

export function spansOf(hours: HoursSpan[], day: number) {
  return hours.filter(s => s.day === day).sort((a, b) => minutesOf(a.opens) - minutesOf(b.opens))
}

/** Keep the list ordered by day, then by opening time, so the data reads the same whichever option wrote it. */
export function sorted(hours: HoursSpan[]) {
  return [...hours].sort((a, b) => a.day - b.day || minutesOf(a.opens) - minutesOf(b.opens))
}

export function setDay(hours: HoursSpan[], day: number, spans: HoursSpan[]) {
  return sorted([...hours.filter(s => s.day !== day), ...spans.map(s => ({ ...s, day }))])
}

/** A second range: two hours that start an hour after the last one closes, or 09:00–18:00 on an empty day. */
export function nextSpan(day: number, existing: HoursSpan[]): HoursSpan {
  const last = existing.at(-1)

  if (!last)
    return span(day, '09:00', '18:00')

  const start = Math.min(minutesOf(last.closes) + 60, 22 * 60)

  return span(day, timeOf(start), timeOf(Math.min(start + 120, 24 * 60 - 15)))
}

export function copyDay(hours: HoursSpan[], from: number, to: number[]) {
  const source = spansOf(hours, from)
  const rest = hours.filter(s => !to.includes(s.day))

  return sorted([...rest, ...to.flatMap(day => source.map(s => span(day, s.opens, s.closes)))])
}

export function isValid(s: HoursSpan) {
  return minutesOf(s.closes) > minutesOf(s.opens)
}
