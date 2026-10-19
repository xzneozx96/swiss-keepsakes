import type { Departure, TourSectionItem } from '@sk/domain/bookings'
import type { LocalizedText } from '@sk/domain/catalog'

/** Shorthand for the curated tours' EN/DE text. */
export const lt = (en: string, de: string): LocalizedText => ({ en, de })

/** One row of a section: an optional label, the text and optional extras. */
export function row(id: string, label: LocalizedText | undefined, text: LocalizedText, rest: Partial<TourSectionItem> = {}): TourSectionItem {
  return { id, ...(label ? { label } : {}), text, ...rest }
}

/** Timetable rows from [time window, id, text, detail]; the time is the same in both languages. */
export function timeline(items: [string, string, LocalizedText, LocalizedText][]): TourSectionItem[] {
  return items.map(([time, id, text, detail]) =>
    row(id, lt(time, time), text, { detail }),
  )
}

/** A Zurich wall-clock time as an ISO instant; summer time ends on 25.10.2026. */
function at(date: string, time: string) {
  return `${date}T${time}:00${date >= '2026-10-25' ? '+01:00' : '+02:00'}`
}

/** A sample departure: the balance is due the evening before, or at the start for full payment. */
export function sampleDeparture({
  id,
  tourId,
  date,
  time,
  capacity = 8,
  policy,
}: {
  id: string
  tourId: string
  date: string
  time: string
  capacity?: number
  policy: Departure['policy']
}): Departure {
  const startsAt = at(date, time)
  const dayBefore = new Date(Date.parse(startsAt) - 86_400_000)
    .toISOString()
    .slice(0, 10)

  return {
    id,
    tourId,
    startsAt,
    capacity,
    policy,
    balanceDueAt: policy === 'full' ? startsAt : at(dayBefore, '18:00'),
    closed: false,
  }
}
