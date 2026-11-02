import { describe, expect, it } from 'vitest'

import { hoursOfWeek, zurichWeekday } from '@/features/map/lib/hours'

const span = (day: number, opens: string, closes: string) => ({ day, opens, closes })
const closed = 'Closed'

describe('[E4.7][N03] opening hours', () => {
  it('reads the weekday in Europe/Zurich, Monday as 1', () => {
    // Sunday 1 Nov 2026, 23:30 UTC is already Monday in Lucerne.
    expect(zurichWeekday(new Date('2026-11-01T23:30:00Z'))).toBe(1)
    expect(zurichWeekday(new Date('2026-11-01T10:00:00Z'))).toBe(7)
    expect(zurichWeekday(new Date('2026-10-28T10:00:00Z'))).toBe(3)
  })

  it('puts days with the same hours on one line and marks the line that holds today', () => {
    const week = [1, 2, 3, 4, 5].map(day => span(day, '09:00:00', '18:00:00')).concat(span(6, '10:00', '16:00'))
    const rows = hoursOfWeek(week, 3, 'en-CH', closed)

    expect(rows.groups).toEqual([
      { days: 'Mon–Fri', value: '09:00–18:00', today: true, closed: false },
      { days: 'Sat', value: '10:00–16:00', today: false, closed: false },
      { days: 'Sun', value: 'Closed', today: false, closed: true },
    ])
    expect(rows.openToday).toBe(true)
  })

  it('shows several spans of a day on its line, and says closed today when today has none', () => {
    const rows = hoursOfWeek([span(1, '08:00', '12:00'), span(1, '14:00', '18:00')], 2, 'de-CH', 'Geschlossen')

    expect(rows.groups[0]).toMatchObject({ days: 'Mo', value: '08:00–12:00, 14:00–18:00', today: false })
    expect(rows.groups.at(-1)).toMatchObject({ days: 'Di–So', value: 'Geschlossen', today: true, closed: true })
    expect(rows.openToday).toBe(false)
  })

  it('has no groups for a pin without hours', () => {
    expect(hoursOfWeek([], 3, 'en-CH', closed)).toEqual({ groups: [], openToday: false })
  })
})
