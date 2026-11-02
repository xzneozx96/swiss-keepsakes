import type { HoursSpan } from './form'

/** Days are 1 (Mon) to 7 (Sun), as the form and the API hold them. */
export const DAYS = [1, 2, 3, 4, 5, 6, 7] as const

export type Day = typeof DAYS[number]

const OPENS = '09:00'
const CLOSES = '18:00'
const LATEST_START = 22 * 60
const MIDNIGHT = 24 * 60
const TIME = /^\d{2}:\d{2}$/

function span(day: number, opens: string, closes: string): HoursSpan {
  return { key: crypto.randomUUID(), day, opens, closes }
}

function minutesOf(time: string) {
  const [h = 0, m = 0] = time.split(':').map(Number)

  return h * 60 + m
}

function timeOf(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

/** A range that closes the next morning: its closing time is before its opening time (24:00 is midnight, not the next morning). */
export function endsNextDay(range: Pick<HoursSpan, 'opens' | 'closes'>) {
  return TIME.test(range.opens) && TIME.test(range.closes) && range.closes < range.opens
}

export function spansOf(hours: HoursSpan[], day: number) {
  return hours.filter(s => s.day === day)
}

/** The list ordered by day. A day's own ranges keep the order they were added in, so a row does not jump while its time is typed. */
function byDay(hours: HoursSpan[]) {
  return [...hours].sort((a, b) => a.day - b.day)
}

/** Replace one day's ranges, leaving the other days as they are. No ranges means closed. */
export function setDay(hours: HoursSpan[], day: number, spans: HoursSpan[]) {
  return byDay([...hours.filter(s => s.day !== day), ...spans.map(s => ({ ...s, day }))])
}

/** The ranges a day gets when it opens: those of the open day before it, or 09:00 to 18:00. */
export function openedDay(hours: HoursSpan[], day: number) {
  for (let before = day - 1; before >= 1; before -= 1) {
    const spans = spansOf(hours, before)

    if (spans.length > 0)
      return spans.map(s => span(day, s.opens, s.closes))
  }

  return [span(day, OPENS, CLOSES)]
}

/** A second range: two hours starting an hour after the last one closes, or 09:00 to 18:00 when the day has none. */
export function nextSpan(day: number, existing: HoursSpan[]) {
  const last = existing.at(-1)

  if (!last || !TIME.test(last.closes))
    return span(day, OPENS, CLOSES)

  const start = Math.min(minutesOf(last.closes) + 60, LATEST_START)

  return span(day, timeOf(start), timeOf(Math.min(start + 120, MIDNIGHT)))
}

/** The ranges of one day written onto the other days, which lose theirs. */
export function copyDay(hours: HoursSpan[], from: number, to: number[]) {
  const source = spansOf(hours, from)

  return byDay([...hours.filter(s => !to.includes(s.day)), ...to.flatMap(day => source.map(s => span(day, s.opens, s.closes)))])
}
