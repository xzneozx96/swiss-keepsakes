import type { ExternalTourPayment, TourBooking, TourData } from '../../types'
import type { Language } from '@/contexts/locale-context'
import type { DemoState, Role } from '@/features/demo/types'

import { zurichDate } from '@/features/catalog/lib/pickup'
import { demoNow } from '@/features/demo/clock'

import { findDuplicatePayment } from '@/lib/payments'

import {
  balanceOverdue,
  bookingBalance,
  bookingPaid,
  participantSeats,
} from '../../lib/selectors'
import { createTourSeed } from '../../seed'
import { mailTourGuest, mailTourStaff } from './mail'

/**
 * Merchant-side tour transitions (steps 2.11–2.14) as pure functions over the demo state.
 * Each re-checks its guard on the state it receives, so a double tap or a stale screen
 * leaves the data unchanged and sends no second email.
 */
export interface StaffContext {
  now: Date
  role: Role
  /** Staff UI language, for staff email (spec §6). */
  language: Language
}

const DAY_MS = 86_400_000

export type ExternalPaymentInput = ExternalTourPayment & {
  /** When the money arrived; never later than now. */
  at: string
  /** The staff member saw the duplicate warning and confirmed again. */
  allowDuplicate?: boolean
}

export type TourBlock
  = | { code: 'staff-only' }
    | { code: 'unavailable' }
    | { code: 'invalid-amount' }
    | { code: 'above-balance', balance: number }
    | { code: 'future-time' }
    | { code: 'duplicate', amount: number, at: string }
    | { code: 'not-ended' }
    | { code: 'not-delivered' }
    | { code: 'balance-owed', balance: number }

export type TourOutcome = 'delivered' | 'no_show' | 'completed'

const isStaff = (role: Role) => role === 'owner' || role === 'manager'

function tourData(state: DemoState): TourData {
  return state.data.tours ?? createTourSeed()
}

function setBooking(state: DemoState, booking: TourBooking): DemoState {
  const data = tourData(state)

  return {
    ...state,
    data: {
      ...state.data,
      tours: {
        ...data,
        bookings: data.bookings.map(b => (b.id === booking.id ? booking : b)),
      },
    },
  }
}

function findBooking(state: DemoState, id: string): TourBooking | undefined {
  return tourData(state).bookings.find(b => b.id === id)
}

/** M08 for tours (AC08): staff only, an open booking, up to the balance, a duplicate warns. */
export function externalPaymentBlock(
  booking: TourBooking,
  input: ExternalPaymentInput,
  role: Role,
  now: Date,
): TourBlock | null {
  if (!isStaff(role))
    return { code: 'staff-only' }
  if (
    ['expired', 'cancelled', 'completed'].includes(booking.status)
    || (booking.status === 'pending_payment'
      && Date.parse(booking.holdUntil) <= now.getTime())
  ) {
    return { code: 'unavailable' }
  }
  if (!Number.isInteger(input.amount) || input.amount <= 0)
    return { code: 'invalid-amount' }
  const owed = bookingBalance(booking)

  if (input.amount > owed)
    return { code: 'above-balance', balance: owed }
  if (Date.parse(input.at) > now.getTime())
    return { code: 'future-time' }
  const duplicate = findDuplicatePayment(
    booking.payments,
    input.amount,
    input.at,
  )

  return duplicate && !input.allowDuplicate
    ? { code: 'duplicate', amount: duplicate.amount, at: duplicate.at }
    : null
}

/** Records money received outside the platform; receipt N07 to the guest. */
export function recordExternalPayment(
  state: DemoState,
  id: string,
  input: ExternalPaymentInput,
  ctx: StaffContext,
): DemoState {
  const booking = findBooking(state, id)

  if (!booking || externalPaymentBlock(booking, input, ctx.role, ctx.now))
    return state
  const payment = {
    id: crypto.randomUUID(),
    amount: input.amount,
    method: input.method,
    status: 'succeeded',
    note: input.note.trim() || undefined,
    at: input.at,
    recordedBy: ctx.role === 'owner' ? 'owner' : 'manager',
  } as const
  const paid: TourBooking = {
    ...booking,
    payments: [...booking.payments, payment],
    activity: [
      ...booking.activity,
      {
        at: ctx.now.toISOString(),
        event: 'payment-succeeded',
        actor: ctx.role,
      },
    ],
  }
  const next: TourBooking
    = paid.status === 'pending_payment' && bookingPaid(paid) >= paid.firstAmount
      ? { ...paid, status: 'confirmed', holdUntil: null }
      : paid

  return mailTourGuest(setBooking(state, next), next, 'N07', ctx.now, {
    amount: input.amount,
  })
}

/**
 * Service delivered and no-show need a confirmed booking whose tour has ended; completion
 * needs service delivered and nothing owed (AC09). No-show never leads to completion.
 */
export function outcomeBlock(
  booking: TourBooking,
  result: TourOutcome,
  role: Role,
  now: Date,
): TourBlock | null {
  if (!isStaff(role))
    return { code: 'staff-only' }
  if (result === 'completed') {
    if (booking.status === 'confirmed')
      return { code: 'not-delivered' }
    if (booking.status !== 'delivered')
      return { code: 'unavailable' }
    const owed = bookingBalance(booking)

    return owed > 0 ? { code: 'balance-owed', balance: owed } : null
  }
  if (booking.status !== 'confirmed')
    return { code: 'unavailable' }

  return Date.parse(booking.endsAt) > now.getTime()
    ? { code: 'not-ended' }
    : null
}

/**
 * Records one booking's outcome. Money is untouched: a no-show keeps what was paid and
 * what is owed (O10). Completion records commission once (AC10) and invites a review (N15).
 */
export function recordOutcome(
  state: DemoState,
  id: string,
  result: TourOutcome,
  ctx: StaffContext,
): DemoState {
  const booking = findBooking(state, id)

  if (!booking || outcomeBlock(booking, result, ctx.role, ctx.now))
    return state
  const at = ctx.now.toISOString()
  const next: TourBooking = {
    ...booking,
    status: result,
    holdUntil: null,
    commissionRecordedAt:
      result === 'completed'
        ? (booking.commissionRecordedAt ?? at)
        : booking.commissionRecordedAt,
    activity: [...booking.activity, { at, event: result, actor: ctx.role }],
  }
  const saved = setBooking(state, next)

  return result === 'completed'
    ? mailTourGuest(saved, next, 'N15', ctx.now)
    : saved
}

/**
 * The balance-deadline check (R07, AC27): cancels and releases the seats of every booking
 * whose snapshotted policy says so, then sends N11 to the guest and staff. Grace and
 * merchant-decision bookings are left for the merchant. Returns `state` itself when
 * nothing is due, so callers can run it on every render.
 */
export function cancelOverdueBookings(
  state: DemoState,
  now: Date,
  staffLanguage: Language,
): DemoState {
  const due = tourData(state).bookings.filter(
    b => balanceOverdue(b, now)?.stage === 'cancel',
  )

  return due.reduce((current, booking) => {
    const next: TourBooking = {
      ...booking,
      status: 'cancelled',
      holdUntil: null,
      activity: [
        ...booking.activity,
        { at: now.toISOString(), event: 'cancelled-overdue', actor: 'system' },
      ],
    }
    const saved = setBooking(current, next)
    const seats = { seats: participantSeats(next) }

    return mailTourStaff(
      mailTourGuest(saved, next, 'N11', now, seats),
      next,
      'N11',
      now,
      staffLanguage,
      seats,
    )
  }, state)
}

/** True when the overdue check would cancel something; lets screens skip a no-op update. */
export function hasOverdueToCancel(data: TourData, now: Date): boolean {
  return data.bookings.some(b => balanceOverdue(b, now)?.stage === 'cancel')
}

/**
 * Prototype reminder run. Balance reminders N10 3 days and 1 day before the deadline are
 * R07 proposals, not approved timing; N13 goes the day before the tour. Each reminder is
 * sent once per booking and step, so running it again sends nothing new.
 */
export function sendTourReminders(state: DemoState, now: Date): DemoState {
  const tomorrow = zurichDate(new Date(now.getTime() + DAY_MS))
  const sent = (booking: TourBooking, template: string, stage?: string) =>
    state.data.mail.some(
      m =>
        m.bookingId === booking.id
        && m.template === template
        && (stage === undefined || m.params.stage === stage),
    )

  return tourData(state).bookings.reduce((current, booking) => {
    if (booking.status !== 'confirmed')
      return current
    let next = current
    const left = Date.parse(booking.balanceDueAt) - now.getTime()
    const stage
      = bookingBalance(booking) === 0 || left <= 0
        ? null
        : left <= DAY_MS
          ? '1d'
          : left <= 3 * DAY_MS
            ? '3d'
            : null

    if (stage && !sent(booking, 'N10', stage)) {
      const policy = booking.overduePolicy

      next = mailTourGuest(next, booking, 'N10', now, {
        stage,
        overdue: policy?.action ?? 'merchant',
      })
    }
    if (
      zurichDate(new Date(booking.startsAt)) === tomorrow
      && !sent(booking, 'N13')
    ) {
      next = mailTourGuest(next, booking, 'N13', now)
    }

    return next
  }, state)
}

/**
 * Prototype control: the demo clock skips to one minute past the balance deadline of the
 * booking on screen (as B's hold skip does), then the balance-deadline check runs at once.
 * The booking's snapshot stays as booked; every other booking sees the same time pass.
 */
export function skipPastBalanceDeadline(
  state: DemoState,
  id: string,
  staffLanguage: Language,
): DemoState {
  const booking = findBooking(state, id)
  const now = demoNow(state.clockStartedAt).getTime()

  if (
    !booking
    || booking.status !== 'confirmed'
    || bookingBalance(booking) === 0
    || Date.parse(booking.balanceDueAt) <= now
  ) {
    return state
  }
  const skip = Date.parse(booking.balanceDueAt) - now + 60_000
  const skipped = { ...state, clockStartedAt: state.clockStartedAt - skip }

  return cancelOverdueBookings(
    skipped,
    demoNow(skipped.clockStartedAt),
    staffLanguage,
  )
}
