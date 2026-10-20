import type {
  Departure,
  Tour,
  TourBooking,
  TourRecords,
} from '@sk/domain/bookings'

import {
  balanceOverdue,
  bookingBalance,
  reconciliationAmount,
} from '@sk/domain/bookings'

/** The tour has ended and the merchant has not recorded delivered or no-show yet (AC09). */
export function needsResult(booking: TourBooking, now: Date): boolean {
  return (
    booking.status === 'confirmed'
    && Date.parse(booking.endsAt) <= now.getTime()
  )
}

/** Money arrived for a booking that had already expired (N22): check and refund. */
export function needsReconciliation(booking: TourBooking): boolean {
  return reconciliationAmount(booking) > 0
}

/**
 * Balance the merchant still collects: confirmed and delivered bookings. A no-show keeps its
 * debt on the booking (O10), but chasing it is a policy decision, so it is not counted here.
 */
export function balanceToCollect(booking: TourBooking): number {
  return booking.status === 'confirmed' || booking.status === 'delivered'
    ? bookingBalance(booking)
    : 0
}

export type DeparturePhase = 'cancelled' | 'ended' | 'closed' | 'open'

export function departureEnd(departure: Departure, tour?: Tour): number {
  return Date.parse(departure.startsAt) + (tour?.durationMinutes ?? 0) * 60_000
}

/** Cancelled by the merchant, ended, closed to new bookings, or open. */
export function departurePhase(
  departure: Departure,
  tour: Tour | undefined,
  now: Date,
): DeparturePhase {
  if (departure.cancelledAt)
    return 'cancelled'
  if (departureEnd(departure, tour) <= now.getTime())
    return 'ended'

  return departure.closed ? 'closed' : 'open'
}

export interface TourWork {
  toRecord: TourBooking[]
  overdue: TourBooking[]
  /** Service delivered, money still owed: completion stays locked. */
  owing: TourBooking[]
  reconcile: TourBooking[]
  toCollect: number
}

/** What needs the merchant, for one departure's bookings or all of them (M02, M05). */
export function tourWork(bookings: TourBooking[], now: Date): TourWork {
  return {
    toRecord: bookings.filter(b => needsResult(b, now)),
    overdue: bookings.filter(b => balanceOverdue(b, now)),
    owing: bookings.filter(
      b => b.status === 'delivered' && bookingBalance(b) > 0,
    ),
    reconcile: bookings.filter(needsReconciliation),
    toCollect: bookings.reduce((sum, b) => sum + balanceToCollect(b), 0),
  }
}

export function departureBookings(
  data: TourRecords,
  departureId: string,
): TourBooking[] {
  return data.bookings.filter(b => b.departureId === departureId)
}

const statusOrder: TourBooking['status'][] = [
  'confirmed',
  'delivered',
  'pending_payment',
  'completed',
  'no_show',
  'cancelled',
  'expired',
]

/** Manifest order: bookings that still need work first, expired holds last. */
export function manifestOrder(a: TourBooking, b: TourBooking): number {
  return (
    statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status)
    || a.contactName.localeCompare(b.contactName)
  )
}
