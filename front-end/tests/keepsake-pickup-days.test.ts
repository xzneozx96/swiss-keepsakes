import { describe, expect, it } from 'vitest'

import { earliestPickupDay, isPickupDay, opensOnWeekday, PICKUP_WINDOW_DAYS } from '@/features/catalog/lib/pickup-days'

const span = (weekday: number, opens: string, closes: string) => ({ weekday, opens, closes })
const everyDay = [1, 2, 3, 4, 5, 6, 7].map(day => span(day, '09:00', '17:00'))
// Zurich is on winter time (UTC+1) from 25 October 2026. 3 November 2026 is a Tuesday.
const tuesday = (time: string) => new Date(`2026-11-03T${time}:00+01:00`)

describe('[E6.4][AC26] the days a pickup point can be picked', () => {
  it('[AC26] AC-3 only the weekdays with a span are pickable, and past days are not', () => {
    const monTue = [span(1, '09:00', '17:00'), span(2, '09:00', '17:00')]
    const now = tuesday('10:00')

    expect(isPickupDay(monTue, '2026-11-09', now)).toBe(true)
    expect(isPickupDay(monTue, '2026-11-10', now)).toBe(true)
    expect(isPickupDay(monTue, '2026-11-11', now)).toBe(false)
    expect(isPickupDay(monTue, '2026-11-02', now)).toBe(false)
    expect(isPickupDay([], '2026-11-09', now)).toBe(false)
  })

  it('[AC26] AC-4 a span that crosses midnight belongs to its first day', () => {
    const friday = [span(5, '22:00', '02:00')]
    const now = tuesday('10:00')

    expect(isPickupDay(friday, '2026-11-06', now)).toBe(true)
    expect(isPickupDay(friday, '2026-11-07', now)).toBe(false)
  })

  it('[AC26] AC-4 today stays pickable until the span that started today has ended, also when it ends tomorrow morning', () => {
    const tue = [span(2, '22:00', '02:00')]

    expect(isPickupDay(tue, '2026-11-03', tuesday('23:30'))).toBe(true)
    // Wednesday 01:00: Wednesday's own span starts at 22:00, so Wednesday is still ahead.
    expect(isPickupDay([span(3, '22:00', '02:00')], '2026-11-04', new Date('2026-11-04T01:00:00+01:00'))).toBe(true)
  })

  it('[AC26] AC-5 today is off when every span that starts today has ended, on when one is still ahead', () => {
    expect(isPickupDay(everyDay, '2026-11-03', tuesday('18:30'))).toBe(false)
    // A point closing at 17:00 offers no pickup at 17:00 itself.
    expect(isPickupDay(everyDay, '2026-11-03', tuesday('17:00'))).toBe(false)
    expect(isPickupDay(everyDay, '2026-11-03', tuesday('10:00'))).toBe(true)
    expect(isPickupDay([span(2, '09:00', '12:00'), span(2, '14:00', '17:00')], '2026-11-03', tuesday('13:00'))).toBe(true)
    expect(isPickupDay([span(2, '09:00', '24:00')], '2026-11-03', tuesday('23:59'))).toBe(true)
  })

  it('[AC26] AC-5 the earliest day: tomorrow after closing, today before', () => {
    expect(earliestPickupDay(everyDay, tuesday('18:30'))).toBe('2026-11-04')
    expect(earliestPickupDay(everyDay, tuesday('10:00'))).toBe('2026-11-03')
    expect(earliestPickupDay([span(1, '09:00', '17:00')], tuesday('10:00'))).toBe('2026-11-09')
    expect(earliestPickupDay([], tuesday('10:00'))).toBeUndefined()
  })

  it('[AC26] days are counted in Zurich, not in UTC', () => {
    // 23:30 in Zurich on Tuesday is 22:30 UTC; 00:30 on Wednesday in Zurich is still Tuesday in UTC.
    const wednesdayEarly = new Date('2026-11-03T23:30:00Z')

    expect(earliestPickupDay([span(2, '09:00', '17:00'), span(3, '09:00', '17:00')], wednesdayEarly)).toBe('2026-11-04')
  })

  it('[AC26] the calendar covers the next 60 days: the 60th is pickable, the 61st is not', () => {
    const now = tuesday('10:00')

    expect(PICKUP_WINDOW_DAYS).toBe(60)
    expect(isPickupDay(everyDay, '2027-01-02', now)).toBe(true)
    expect(isPickupDay(everyDay, '2027-01-03', now)).toBe(false)
  })

  it('[AC26] a Sunday span is weekday 7', () => {
    const sunday = [span(7, '10:00', '14:00')]
    const now = tuesday('10:00')

    expect(isPickupDay(sunday, '2026-11-08', now)).toBe(true)
    expect(isPickupDay(sunday, '2026-11-09', now)).toBe(false)
    expect(earliestPickupDay(sunday, now)).toBe('2026-11-08')
  })

  it('[AC26] tells a day with no span from today after its span ended', () => {
    expect(opensOnWeekday(everyDay, '2026-11-03')).toBe(true)
    expect(opensOnWeekday([span(1, '09:00', '17:00')], '2026-11-03')).toBe(false)
  })
})
