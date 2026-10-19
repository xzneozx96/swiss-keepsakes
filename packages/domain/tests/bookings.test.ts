import { describe, expect, it } from 'vitest'

import * as bookings from '../src/bookings'

const booking = (over: Record<string, unknown> = {}) => ({
  id: 'b1',
  status: 'pending_payment',
  total: 10_000,
  firstAmount: 3000,
  payments: [{ id: 'x', amount: 1000, method: 'online', status: 'succeeded', at: '2026-10-19T10:00:00Z' }, { id: 'y', amount: 5000, method: 'online', status: 'failed', at: '2026-10-19T10:00:00Z' }],
  commissionRate: 0.1,
  partnerId: 'pt1',
  createdAt: '2026-10-19T10:00:00.000Z',
  startsAt: '2026-11-01T08:00:00.000Z',
  endsAt: '2026-11-01T12:00:00.000Z',
  ...over,
}) as unknown as bookings.TourBooking

describe('[E1.2] bookings/selectors', () => {
  it('works out paid, balance and the amount due by status', () => {
    expect(bookings.bookingPaid(booking())).toBe(1000)
    expect(bookings.bookingBalance(booking())).toBe(9000)
    expect(bookings.bookingAmountDue(booking())).toBe(2000)
    expect(bookings.bookingAmountDue(booking({ status: 'confirmed' }))).toBe(9000)
  })

  it('takes a 30% deposit, the full total or nothing as the first payment', () => {
    expect(bookings.firstPaymentAmount('deposit', 10_000)).toBe(3000)
    expect(bookings.firstPaymentAmount('full', 10_000)).toBe(10_000)
  })

  it('records commission only for a partner booking and never after a no-show', () => {
    expect(bookings.bookingCommission(booking()).state).toBe('estimated')
    expect(bookings.bookingCommission(booking({ partnerId: undefined })).state).toBe('none')
    expect(bookings.bookingCommission(booking({ status: 'no_show' })).state).toBe('not-applicable')
    expect(bookings.bookingCommission(booking()).amount).toBe(1000)
  })
})

describe('[E1.2] bookings/calendar', () => {
  it('builds a one-event calendar file with escaped text', () => {
    const href = bookings.calendarHref(booking(), { name: 'Old town, Lucerne', place: 'Bahnhof', note: 'Line 1\nLine 2' })
    const ics = decodeURIComponent(href.split(',')[1])

    expect(href.startsWith('data:text/calendar')).toBe(true)
    expect(ics).toContain('DTSTART:20261101T080000Z')
    expect(ics).toContain('SUMMARY:Old town\\, Lucerne')
    expect(ics).toContain('DESCRIPTION:Line 1\\nLine 2')
  })
})
