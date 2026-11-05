import { describe, expect, it } from 'vitest'

import { statusAt } from '@/lib/hours'

// Monday is 1 (ADR-029). Thursday is 4.
const lunchAndDinner = [{ day: 4, opens: '11:30', closes: '14:00' }, { day: 4, opens: '18:00', closes: '22:00' }]

describe('statusAt: where a place stands at a moment (owner, 05.11.2026)', () => {
  it('is open until the end of the span that holds the time', () => {
    expect(statusAt(lunchAndDinner, 4, '12:15')).toEqual({ state: 'open', until: '14:00' })
    expect(statusAt(lunchAndDinner, 4, '18:00')).toEqual({ state: 'open', until: '22:00' })
  })

  it('opens later today: before the first span and between two spans', () => {
    expect(statusAt(lunchAndDinner, 4, '09:00')).toEqual({ state: 'opens-later', opensAt: '11:30' })
    expect(statusAt(lunchAndDinner, 4, '14:00')).toEqual({ state: 'opens-later', opensAt: '18:00' })
  })

  it('counts a span past midnight as open until it closes, on the evening and on the next morning', () => {
    const late = [{ day: 4, opens: '18:00', closes: '01:30' }]

    expect(statusAt(late, 4, '23:30')).toEqual({ state: 'open', until: '01:30' })
    expect(statusAt(late, 5, '00:45')).toEqual({ state: 'open', until: '01:30' })
    expect(statusAt(late, 5, '01:30')).toEqual({ state: 'closed-today', nextDay: 4, inDays: 6, opensAt: '18:00' })
  })

  it('reads a closing time of 24:00 or 00:00 as midnight', () => {
    expect(statusAt([{ day: 4, opens: '10:00', closes: '00:00' }], 4, '23:59')).toEqual({ state: 'open', until: '00:00' })
  })

  it('after the last span of the day, or on a day off, gives the next opening day, tomorrow included', () => {
    expect(statusAt([...lunchAndDinner, { day: 5, opens: '11:30', closes: '14:00' }], 4, '22:30')).toEqual({ state: 'closed-today', nextDay: 5, inDays: 1, opensAt: '11:30' })
    // Thursday off: Saturday is two days on; Sunday wraps to Monday.
    expect(statusAt([{ day: 6, opens: '09:00', closes: '17:00' }, { day: 6, opens: '07:30', closes: '08:00' }], 4, '10:00')).toEqual({ state: 'closed-today', nextDay: 6, inDays: 2, opensAt: '07:30' })
    expect(statusAt([{ day: 1, opens: '08:00', closes: '12:00' }], 7, '10:00')).toEqual({ state: 'closed-today', nextDay: 1, inDays: 1, opensAt: '08:00' })
  })

  it('looks a whole week ahead: the same weekday next week counts', () => {
    expect(statusAt([{ day: 4, opens: '09:00', closes: '10:00' }], 4, '11:00')).toEqual({ state: 'closed-today', nextDay: 4, inDays: 7, opensAt: '09:00' })
  })

  it('gives nothing without hours', () => {
    expect(statusAt([], 4, '12:00')).toBeUndefined()
  })
})
