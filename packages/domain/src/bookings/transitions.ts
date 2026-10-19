import type { BookingStatus } from './types'
import type { Transition, TransitionTable } from '../shared/transitions'

import { canMove, listTransitions } from '../shared/transitions'

/**
 * Tour booking lifecycle (UX spec §2.2). Only `pending_payment` can confirm, and `no_show`
 * never reaches `completed` (AC09, O10): completion needs the service `delivered`.
 * A merchant-cancelled departure cancels its bookings, it never marks them `no_show`.
 */
export const BOOKING_TRANSITIONS: TransitionTable<BookingStatus> = {
  pending_payment: ['confirmed', 'expired'],
  confirmed: ['delivered', 'no_show', 'cancelled'],
  delivered: ['completed'],
  completed: [],
  expired: [],
  no_show: [],
  cancelled: [],
}

export type BookingTransition = Transition<BookingStatus>

export const BOOKING_STATUSES = Object.keys(BOOKING_TRANSITIONS) as BookingStatus[]

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return canMove(BOOKING_TRANSITIONS, from, to)
}

export function bookingTransitions(): BookingTransition[] {
  return listTransitions(BOOKING_TRANSITIONS)
}
