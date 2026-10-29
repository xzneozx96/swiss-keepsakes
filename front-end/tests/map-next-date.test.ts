import type { NextDate } from '@sk/api-contract'

import { describe, expect, it } from 'vitest'

import { nextDateLine, zurichToday } from '@/features/map/lib/next-date'

const copy = {
  until: (day: string) => `Until ${day}`,
  from: (time: string) => `from ${time}`,
}

function next(overrides: Partial<NextDate>): NextDate {
  return { firstDay: '2026-11-07', lastDay: '2026-11-07', startTime: null, endTime: null, ...overrides }
}

describe('[E4.6][AC42] next date line', () => {
  it('reads the Zurich calendar day, not the UTC day', () => {
    expect(zurichToday(new Date('2026-10-30T23:30:00Z'))).toBe('2026-10-31')
    expect(zurichToday(new Date('2026-10-30T10:00:00Z'))).toBe('2026-10-30')
  })

  it('shows one day with its time span', () => {
    expect(nextDateLine(next({ startTime: '18:00:00', endTime: '20:30:00' }), '2026-10-30', 'en-CH', copy)).toBe('Sat 7 Nov, 18:00–20:30')
  })

  it('shows only the start time when the event has no end time', () => {
    expect(nextDateLine(next({ startTime: '22:00' }), '2026-10-30', 'en-CH', copy)).toBe('Sat 7 Nov, from 22:00')
  })

  it('shows one day without times as the day alone', () => {
    expect(nextDateLine(next({}), '2026-10-30', 'en-CH', copy)).toBe('Sat 7 Nov')
  })

  it('shows a range that has not started as from and to', () => {
    expect(nextDateLine(next({ firstDay: '2026-11-07', lastDay: '2026-11-09' }), '2026-10-30', 'en-CH', copy)).toBe('Sat 7 Nov – Mon 9 Nov')
  })

  it('shows a range that has started as until its last day', () => {
    expect(nextDateLine(next({ firstDay: '2026-10-28', lastDay: '2026-11-02' }), '2026-10-30', 'en-CH', copy)).toBe('Until Mon 2 Nov')
  })

  it('writes the German day with a dot', () => {
    expect(nextDateLine(next({}), '2026-10-30', 'de-CH', copy)).toMatch(/^Sa\.?, 7\. Nov\.?$/)
  })
})
