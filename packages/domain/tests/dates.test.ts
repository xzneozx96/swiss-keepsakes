import { describe, expect, it } from 'vitest'

import {
  addCalendarDays,
  balanceReminder,
  dayBeforeReminder,
  firstPaymentReminders,
  isPickupDateInRange,
  isWithinPickupWindow,
  reminderSet,
  zurichDate,
  zurichInstant,
  zurichOffsetMinutes,
} from '../src/dates'

const iso = (d: Date) => d.toISOString()

describe('[E1.6] Zurich calendar day', () => {
  it('rolls over at local midnight, winter and summer', () => {
    expect(zurichDate(new Date('2026-01-15T22:59:59Z'))).toBe('2026-01-15')
    expect(zurichDate(new Date('2026-01-15T23:00:00Z'))).toBe('2026-01-16')
    expect(zurichDate(new Date('2026-07-15T21:59:59Z'))).toBe('2026-07-15')
    expect(zurichDate(new Date('2026-07-15T22:00:00Z'))).toBe('2026-07-16')
  })

  it('changes offset on 2026-03-29 and 2026-10-25 at 01:00 UTC', () => {
    expect(zurichOffsetMinutes(new Date('2026-03-29T00:59:59Z'))).toBe(60)
    expect(zurichOffsetMinutes(new Date('2026-03-29T01:00:00Z'))).toBe(120)
    expect(zurichOffsetMinutes(new Date('2026-10-25T00:59:59Z'))).toBe(120)
    expect(zurichOffsetMinutes(new Date('2026-10-25T01:00:00Z'))).toBe(60)
  })

  it('matches the EU daylight-saving rule for every hour of 2026', () => {
    const lastSunday = (month: number) => {
      const last = new Date(Date.UTC(2026, month, 0))

      return Date.UTC(2026, month - 1, last.getUTCDate() - last.getUTCDay(), 1)
    }
    const start = lastSunday(3)
    const end = lastSunday(10)

    for (let ms = Date.UTC(2026, 0, 1); ms < Date.UTC(2027, 0, 1); ms += 3_600_000) {
      const offset = ms >= start && ms < end ? 120 : 60

      expect(zurichOffsetMinutes(new Date(ms))).toBe(offset)
      expect(zurichDate(new Date(ms))).toBe(new Date(ms + offset * 60_000).toISOString().slice(0, 10))
    }
  })

  it('moves calendar days across a DST change without drift', () => {
    expect(addCalendarDays('2026-03-28', 1)).toBe('2026-03-29')
    expect(addCalendarDays('2026-03-01', -1)).toBe('2026-02-28')
  })
})

describe('[E1.6] reminders (Q5)', () => {
  it('first payment: 24 h and 2 h before the deadline', () => {
    const r = firstPaymentReminders(new Date('2026-10-20T10:00:00Z'))

    expect(r.map(x => [x.kind, iso(x.at)])).toEqual([
      ['first-payment-first', '2026-10-19T10:00:00.000Z'],
      ['first-payment-second', '2026-10-20T08:00:00.000Z'],
    ])
  })

  it('first payment stays exact hours across the spring change', () => {
    const r = firstPaymentReminders(new Date('2026-03-29T10:00:00Z'))

    expect(iso(r[0].at)).toBe('2026-03-28T10:00:00.000Z')
  })

  it('day before at 18:00 Zurich, spring: tour on 2026-03-29 gives 18:00 CET on the 28th', () => {
    expect(iso(dayBeforeReminder('tour', '2026-03-29').at)).toBe('2026-03-28T17:00:00.000Z')
  })

  it('day before at 18:00 Zurich, spring: pickup on 2026-03-30 gives 18:00 CEST on the 29th', () => {
    expect(iso(dayBeforeReminder('pickup', '2026-03-30').at)).toBe('2026-03-29T16:00:00.000Z')
  })

  it('spring: the same 18:00 wall time is one hour apart in UTC on both sides', () => {
    const before = dayBeforeReminder('tour', '2026-03-29').at
    const after = dayBeforeReminder('tour', '2026-03-30').at

    expect(after.getTime() - before.getTime()).toBe(23 * 3_600_000)
    expect(zurichInstant('2026-03-28', '18:00').getUTCHours()).toBe(17)
    expect(zurichInstant('2026-03-29', '18:00').getUTCHours()).toBe(16)
  })

  it('autumn: 18:00 Zurich is 16:00 UTC before 2026-10-25 and 17:00 UTC after', () => {
    const before = dayBeforeReminder('tour', '2026-10-25').at
    const after = dayBeforeReminder('tour', '2026-10-26').at

    expect(iso(before)).toBe('2026-10-24T16:00:00.000Z')
    expect(iso(after)).toBe('2026-10-25T17:00:00.000Z')
    expect(after.getTime() - before.getTime()).toBe(25 * 3_600_000)
  })

  it('every reminder reads 18:00 on the Zurich clock for each day of 2026', () => {
    const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit', hour12: false })

    for (let i = 0; i < 365; i++) {
      const date = addCalendarDays('2026-01-02', i)

      expect(fmt.format(dayBeforeReminder('pickup', date).at)).toBe('18:00')
    }
  })

  it('balance reminder: 3 days before the due date, at the same Zurich time across the change', () => {
    expect(iso(balanceReminder('2026-03-31').at)).toBe('2026-03-28T08:00:00.000Z')
    expect(iso(balanceReminder('2026-03-28').at)).toBe('2026-03-25T08:00:00.000Z')
    expect(iso(balanceReminder('2026-10-27').at)).toBe('2026-10-24T07:00:00.000Z')
    expect(iso(balanceReminder('2026-10-29').at)).toBe('2026-10-26T08:00:00.000Z')
  })

  it('reminderSet returns only what applies, oldest first', () => {
    const acceptedAt = new Date('2026-10-19T08:00:00Z')

    expect(reminderSet({ acceptedAt })).toEqual([])
    const set = reminderSet({
      acceptedAt,
      pickupDate: '2026-10-27',
      firstPaymentDeadline: new Date('2026-10-20T10:00:00Z'),
    })

    expect(set.map(r => r.kind)).toEqual(['first-payment-first', 'first-payment-second', 'pickup'])
  })

  it('reminderSet applies the merchant overrides', () => {
    const set = reminderSet({
      acceptedAt: new Date('2026-10-01T00:00:00Z'),
      balanceDueDate: '2026-10-27',
      pickupDate: '2026-10-30',
      firstPaymentDeadline: new Date('2026-10-20T10:00:00Z'),
      settings: { firstPaymentHoursBefore: [48, 6], balanceDaysBefore: 5, balanceTime: '10:30', dayBeforeTime: '17:00' },
    })

    expect(set.map(r => [r.kind, iso(r.at)])).toEqual([
      ['first-payment-first', '2026-10-18T10:00:00.000Z'],
      ['first-payment-second', '2026-10-20T04:00:00.000Z'],
      ['balance', '2026-10-22T08:30:00.000Z'],
      ['pickup', '2026-10-29T16:00:00.000Z'],
    ])
  })

  it('reminderSet drops a reminder that falls before the order was accepted and keeps one at that instant', () => {
    const deadline = new Date('2026-10-20T10:00:00Z')
    const late = reminderSet({ acceptedAt: new Date('2026-10-20T04:00:00Z'), firstPaymentDeadline: deadline })
    const exact = reminderSet({ acceptedAt: new Date('2026-10-20T08:00:00Z'), firstPaymentDeadline: deadline })

    expect(late.map(r => r.kind)).toEqual(['first-payment-second'])
    expect(exact.map(r => r.kind)).toEqual(['first-payment-second'])
    expect(reminderSet({ acceptedAt: new Date('2026-10-20T08:00:00.001Z'), firstPaymentDeadline: deadline })).toEqual([])
  })
})

describe('[E1.6] pickup windows', () => {
  const window = { date: '2026-10-26', from: '09:00', to: '17:00' }

  it('is inclusive of the opening time and exclusive of closing, on Zurich time', () => {
    expect(isWithinPickupWindow(new Date('2026-10-26T07:59:59Z'), window)).toBe(false)
    expect(isWithinPickupWindow(new Date('2026-10-26T08:00:00Z'), window)).toBe(true)
    expect(isWithinPickupWindow(new Date('2026-10-26T15:59:59Z'), window)).toBe(true)
    expect(isWithinPickupWindow(new Date('2026-10-26T16:00:00Z'), window)).toBe(false)
  })

  it('uses summer time on the day before the autumn change', () => {
    const w = { date: '2026-10-24', from: '09:00', to: '17:00' }

    expect(isWithinPickupWindow(new Date('2026-10-24T07:00:00Z'), w)).toBe(true)
    expect(isWithinPickupWindow(new Date('2026-10-24T06:59:59Z'), w)).toBe(false)
  })

  it('checks a pickup date against the earliest date and the booking horizon', () => {
    const now = new Date('2026-10-19T10:00:00Z')

    expect(isPickupDateInRange('2026-10-20', '2026-10-21', now, 30)).toBe(false)
    expect(isPickupDateInRange('2026-10-21', '2026-10-21', now, 30)).toBe(true)
    expect(isPickupDateInRange('2026-11-18', '2026-10-21', now, 30)).toBe(true)
    expect(isPickupDateInRange('2026-11-19', '2026-10-21', now, 30)).toBe(false)
  })

  it('rejects malformed input', () => {
    expect(() => zurichInstant('2026-10-26', '9:00')).toThrow(RangeError)
    expect(() => zurichInstant('nope', '09:00')).toThrow(RangeError)
  })
})
