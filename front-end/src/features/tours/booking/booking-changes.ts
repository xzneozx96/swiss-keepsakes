import type { TourBooking, TourData } from '@sk/domain/bookings'
import type { Language } from '@/contexts/locale-context'
import type { DemoState } from '@/features/demo/types'
import type { Outcome } from '@/features/payment/hooks/use-payment'

import { bookingAmountDue } from '@sk/domain/bookings'
import { demoNow } from '@/features/demo/clock'
import { mailTourGuest, mailTourStaff } from '../merchant/lib/mail'
import { createTourSeed } from '../seed'
import { bookingMails } from './transitions'

/** A tour change plus the emails it calls for, in one update (spec §6, worker C's helpers). */
export function changeWithMails(
  state: DemoState,
  id: string,
  recipe: (data: TourData) => TourData,
  language: Language,
): DemoState {
  const before = state.data.tours ?? createTourSeed()
  const after = recipe(before)
  const was = before.bookings.find(b => b.id === id)
  const is = after.bookings.find(b => b.id === id)
  const at = demoNow(state.clockStartedAt)
  const next: DemoState = { ...state, data: { ...state.data, tours: after } }

  if (!is || is === was)
    return next

  return bookingMails(was, is).reduce(
    (mailed, mail) =>
      mail.to === 'staff'
        ? mailTourStaff(mailed, is, mail.template, at, language, mail.params)
        : mailTourGuest(mailed, is, mail.template, at, mail.params),
    next,
  )
}

/** The guest's online payment of what is due now; a closed or settled booking stays as it is. */
export function startPayment(
  b: TourBooking,
  outcome: Outcome,
  at: string,
): TourBooking {
  if (
    ['expired', 'cancelled', 'completed', 'no_show'].includes(b.status)
    || b.payments.some(p => p.status === 'processing')
    || bookingAmountDue(b) <= 0
  ) {
    return b
  }
  const payment = {
    id: crypto.randomUUID(),
    amount: bookingAmountDue(b),
    method: 'online',
    status: outcome,
    at,
  } as const
  const next = {
    ...b,
    payments: [...b.payments, payment],
    activity: [...b.activity, { at, event: `payment-${outcome}`, actor: 'guest' }],
  }

  return outcome === 'succeeded' && b.status === 'pending_payment'
    ? { ...next, status: 'confirmed', holdUntil: null }
    : next
}
