import { describe, expect, it } from 'vitest'

import { hoursOfWeek, isOpenAt, zurichWeekday } from '@/lib/hours'

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

  it('[T-013] an overnight span shows as it is and counts the next morning as open', () => {
    const bar = [span(5, '18:00', '02:00')]

    expect(hoursOfWeek(bar, 5, 'en-CH', closed).groups[1]).toMatchObject({ days: 'Fri', value: '18:00–02:00', today: true })
    // Saturday has no span of its own, but the Friday evening is still open until 02:00.
    expect(hoursOfWeek(bar, 6, 'en-CH', closed).openToday).toBe(true)
    expect(hoursOfWeek(bar, 7, 'en-CH', closed).openToday).toBe(false)
    // Sunday into Monday.
    expect(hoursOfWeek([span(7, '22:00', '01:00')], 1, 'en-CH', closed).openToday).toBe(true)
    // A day that closes at midnight leaves nothing for the next day.
    expect(hoursOfWeek([span(5, '18:00', '24:00')], 6, 'en-CH', closed).openToday).toBe(false)
  })

  it('[T-013] is open at a time of day, including after midnight from the previous day\'s span', () => {
    const bar = [span(5, '18:00', '02:00'), span(7, '22:00', '00:00')]

    expect(isOpenAt(bar, 5, '17:59')).toBe(false)
    expect(isOpenAt(bar, 5, '18:00')).toBe(true)
    expect(isOpenAt(bar, 5, '23:59')).toBe(true)
    expect(isOpenAt(bar, 6, '01:59')).toBe(true)
    expect(isOpenAt(bar, 6, '02:00')).toBe(false)
    expect(isOpenAt(bar, 6, '19:00')).toBe(false)
    // Sunday 22:00 to 00:00 ends Sunday midnight; Monday morning is closed.
    expect(isOpenAt(bar, 7, '23:00')).toBe(true)
    expect(isOpenAt(bar, 1, '00:00')).toBe(false)
    // A normal span does not leak into the next day, and 24:00 closes at midnight.
    expect(isOpenAt([span(2, '09:00', '18:00')], 3, '10:00')).toBe(false)
    expect(isOpenAt([span(2, '09:00', '24:00')], 2, '23:59')).toBe(true)
    expect(isOpenAt([span(2, '09:00', '24:00')], 3, '00:10')).toBe(false)
    // Sunday evening into Monday morning wraps the week.
    expect(isOpenAt([span(7, '22:00', '03:00')], 1, '02:00')).toBe(true)
  })
})
