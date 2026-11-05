import { describe, expect, it } from 'vitest'

import { weekSummary } from '@/lib/hours'

const span = (day: number, opens: string, closes: string) => ({ day, opens, closes })
const every = (opens: string, closes: string, days = [1, 2, 3, 4, 5, 6, 7]) => days.map(day => span(day, opens, closes))

describe('weekSummary: the week’s hours in one short line (owner, 05.11.2026)', () => {
  it('says Daily (Täglich) when every day has the same hours', () => {
    expect(weekSummary(every('09:00', '19:00'), 'en-CH', 'Daily')).toBe('Daily 09:00–19:00')
    expect(weekSummary(every('09:00', '19:00'), 'de-CH', 'Täglich')).toBe('Täglich 09:00–19:00')
  })

  it('groups days in a row into a range and the groups with a dot', () => {
    const week = [...every('09:00', '18:00', [1, 2, 3, 4, 5]), span(6, '09:00', '17:00')]

    expect(weekSummary(week, 'en-CH', 'Daily')).toBe('Mon–Fri 09:00–18:00 · Sat 09:00–17:00')
  })

  it('comma-joins days that are not in a row, and leaves the days off out', () => {
    expect(weekSummary(every('07:00', '12:00', [2, 6]), 'en-CH', 'Daily')).toBe('Tue, Sat 07:00–12:00')
  })

  it('keeps two spans of a day together, earliest first', () => {
    const week = [span(2, '18:00', '22:00'), span(2, '11:30', '14:00'), span(3, '11:30', '14:00'), span(3, '18:00', '22:00')]

    expect(weekSummary(week, 'en-CH', 'Daily')).toBe('Tue–Wed 11:30–14:00, 18:00–22:00')
  })

  it('shows a span past midnight as stored, on the day it opens', () => {
    expect(weekSummary([...every('18:00', '01:30', [5, 6]), span(4, '18:00', '23:00')], 'en-CH', 'Daily')).toBe('Thu 18:00–23:00 · Fri–Sat 18:00–01:30')
  })

  it('runs a range across the week’s end (Sat–Mon)', () => {
    const week = [...every('10:00', '16:00', [6, 7, 1]), ...every('09:00', '18:00', [2, 3, 4, 5])]

    expect(weekSummary(week, 'en-CH', 'Daily')).toBe('Sat–Mon 10:00–16:00 · Tue–Fri 09:00–18:00')
  })

  it('names the days in the guest’s language', () => {
    expect(weekSummary(every('07:00', '12:00', [2, 6]), 'de-CH', 'Täglich')).toBe('Di, Sa 07:00–12:00')
  })

  it('gives nothing without hours', () => {
    expect(weekSummary([], 'en-CH', 'Daily')).toBeUndefined()
  })
})
