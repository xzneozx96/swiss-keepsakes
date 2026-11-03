import type { FunnelCounter, ReferrerClass, Segment } from '../ports.ts'
import { InvalidOrderSubmit, referrerClasses, segments } from '../ports.ts'

export interface RecordOrderSubmitDeps {
  funnels: FunnelCounter
}

const isoDay = /^\d{4}-\d{2}-\d{2}$/

function isRealDay(day: string): boolean {
  if (!isoDay.test(day))
    return false
  const parsed = new Date(`${day}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(day)
}

// E7.1 calls this when an order is placed, with the Europe/Zurich day and the two values the browser held in
// memory. It takes nothing else on purpose: no order, session or account id reaches the counter (ADR-032).
// A value outside the closed sets is refused before the database is touched.
export function makeRecordOrderSubmit({ funnels }: RecordOrderSubmitDeps) {
  return async (day: string, referrerClass: ReferrerClass, segment: Segment): Promise<void> => {
    if (!isRealDay(day))
      throw new InvalidOrderSubmit('the day is not an ISO date')
    if (!referrerClasses.includes(referrerClass))
      throw new InvalidOrderSubmit('the referrer class is not a known value')
    if (segment !== null && !segments.includes(segment))
      throw new InvalidOrderSubmit('the segment is not a known value')
    await funnels.countOrderSubmit(day, referrerClass, segment)
  }
}
