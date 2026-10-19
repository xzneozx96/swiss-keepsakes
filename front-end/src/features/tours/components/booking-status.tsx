import type { TourBooking } from '@sk/domain/bookings'
import type { MoneyInput, PaymentCode } from '@sk/domain/money'
import type { StatusTone } from '@/components/status-chip'
import type { MessageKey } from '@/i18n/en'

import { bookingAmountDue } from '@sk/domain/bookings'
import { moneyState } from '@sk/domain/money'

import { StatusChip } from '@/components/status-chip'
import { useLocale } from '@/contexts/locale-context'
import { useDemoNow } from '@/features/demo'

const tones: Record<TourBooking['status'], StatusTone> = {
  pending_payment: 'warning',
  confirmed: 'success',
  expired: 'danger',
  delivered: 'info',
  completed: 'success',
  no_show: 'danger',
  cancelled: 'neutral',
}

// A tour has no first-payment or "due" copy: those codes fall to the same chip as unpaid.
const paymentLabels: Record<PaymentCode, { key: MessageKey, tone: StatusTone }> = {
  'after-expiry': { key: 'tours.payment.exception', tone: 'warning' },
  'session-closed': { key: 'tours.payment.sessionClosed', tone: 'neutral' },
  'none': { key: 'tours.payment.none', tone: 'neutral' },
  'paid': { key: 'tours.payment.closed', tone: 'neutral' },
  'processing': { key: 'tours.payment.processing', tone: 'info' },
  'overdue': { key: 'tours.payment.overdue', tone: 'danger' },
  'paid-in-full': { key: 'tours.payment.paid', tone: 'success' },
  'deposit-paid': { key: 'tours.payment.deposit', tone: 'warning' },
  'part-paid-due': { key: 'tours.payment.deposit', tone: 'warning' },
  'part-paid': { key: 'tours.payment.deposit', tone: 'warning' },
  'owed': { key: 'tours.payment.unpaid', tone: 'warning' },
  'pay-later': { key: 'tours.payment.unpaid', tone: 'warning' },
  'due': { key: 'tours.payment.unpaid', tone: 'warning' },
  'not-due': { key: 'tours.payment.unpaid', tone: 'warning' },
  'after-cancellation': { key: 'tours.payment.closed', tone: 'neutral' },
}

function moneyInput(booking: TourBooking): MoneyInput {
  const cancelled = booking.status === 'cancelled'

  return {
    // A cancelled booking owes nothing more; a payment still processing does not change that copy.
    entries: booking.payments
      .filter(p => !cancelled || p.status !== 'processing')
      .map(p => ({ kind: 'collection' as const, status: p.status, amount: p.amount, at: p.at })),
    total: booking.total,
    stage: cancelled ? 'closed' : booking.status === 'expired' ? 'expired' : 'open',
    dueNow: bookingAmountDue(booking),
    awaitingFirstPayment: false,
    // Only a confirmed booking can be overdue (R07, step 2.14); the policy decides what follows.
    balanceDueAt: booking.status === 'confirmed' ? booking.balanceDueAt : null,
    depositPolicy: booking.policy === 'deposit',
  }
}

export interface BookingLabel {
  text: string
  tone: StatusTone
}

/**
 * The booking label and the payment label of a tour booking, as text and tone. Chips use them
 * (BookingStatusLabels); the M06 ticket shows them as a dot line and a footer row, as M03 does.
 */
export function useBookingLabels(booking: TourBooking): {
  status: BookingLabel
  payment: BookingLabel
} {
  const { t } = useLocale()
  const { payment } = moneyState(moneyInput(booking), useDemoNow())
  const { key, tone } = paymentLabels[payment]

  return {
    status: {
      text: t(`tours.status.${booking.status}`),
      tone: tones[booking.status],
    },
    payment: { text: t(key), tone },
  }
}

export function BookingStatusLabels({ booking }: { booking: TourBooking }) {
  const { status, payment } = useBookingLabels(booking)

  return (
    <div className="flex flex-wrap gap-2">
      <StatusChip tone={status.tone}>{status.text}</StatusChip>
      <StatusChip tone={payment.tone}>{payment.text}</StatusChip>
    </div>
  )
}
