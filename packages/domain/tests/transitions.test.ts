import { describe, expect, it } from 'vitest'

import * as bookings from '../src/bookings'
import * as orders from '../src/orders'

import type { BookingStatus } from '../src/bookings'
import type { OrderStatus } from '../src/orders'

const orderStatuses: OrderStatus[] = ['requested', 'accepted', 'preparing', 'ready', 'handed_over', 'completed', 'declined', 'cancelled']
const bookingStatuses: BookingStatus[] = ['pending_payment', 'confirmed', 'expired', 'delivered', 'completed', 'no_show', 'cancelled']

const allowedOrder = new Set([
  'requested>accepted',
  'requested>preparing',
  'requested>declined',
  'requested>cancelled',
  'accepted>preparing',
  'accepted>cancelled',
  'preparing>ready',
  'preparing>cancelled',
  'ready>handed_over',
  'ready>cancelled',
  'handed_over>completed',
])

const allowedBooking = new Set([
  'pending_payment>confirmed',
  'pending_payment>expired',
  'confirmed>delivered',
  'confirmed>no_show',
  'confirmed>cancelled',
  'delivered>completed',
])

describe('[E1.3] order transitions', () => {
  it('covers every status', () => {
    expect([...orders.ORDER_STATUSES].sort()).toEqual([...orderStatuses].sort())
  })

  for (const from of orderStatuses) {
    for (const to of orderStatuses) {
      const allowed = allowedOrder.has(`${from}>${to}`)

      it(`${allowed ? 'allows' : 'refuses'} ${from} to ${to}`, () => {
        expect(orders.canTransition(from, to)).toBe(allowed)
      })
    }
  }

  it('lists exactly the allowed moves', () => {
    expect(orders.orderTransitions().map(t => `${t.from}>${t.to}`).sort()).toEqual([...allowedOrder].sort())
  })

  it('ends at completed, declined and cancelled', () => {
    for (const end of ['completed', 'declined', 'cancelled'] as const)
      expect(orders.ORDER_TRANSITIONS[end]).toEqual([])
  })
})

describe('[E1.3] booking transitions', () => {
  it('covers every status', () => {
    expect([...bookings.BOOKING_STATUSES].sort()).toEqual([...bookingStatuses].sort())
  })

  for (const from of bookingStatuses) {
    for (const to of bookingStatuses) {
      const allowed = allowedBooking.has(`${from}>${to}`)

      it(`${allowed ? 'allows' : 'refuses'} ${from} to ${to}`, () => {
        expect(bookings.canTransition(from, to)).toBe(allowed)
      })
    }
  }

  it('lists exactly the allowed moves', () => {
    expect(bookings.bookingTransitions().map(t => `${t.from}>${t.to}`).sort()).toEqual([...allowedBooking].sort())
  })

  it('never lets no_show reach completed, even in several steps', () => {
    const reach = new Set<BookingStatus>()
    const walk = (s: BookingStatus) => {
      for (const next of bookings.BOOKING_TRANSITIONS[s]) {
        if (!reach.has(next)) {
          reach.add(next)
          walk(next)
        }
      }
    }

    walk('no_show')
    expect(bookings.canTransition('no_show', 'completed')).toBe(false)
    expect(reach.size).toBe(0)
  })

  it('lets only pending_payment confirm', () => {
    const sources = bookingStatuses.filter(s => bookings.canTransition(s, 'confirmed'))

    expect(sources).toEqual(['pending_payment'])
  })
})
