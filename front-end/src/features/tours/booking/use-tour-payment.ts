import type { TourBooking } from '@sk/domain/bookings'
import type {
  Outcome,
  PaymentStep,
  PaymentView,
} from '@/features/payment/hooks/use-payment'

import { bookingAmountDue } from '@sk/domain/bookings'
import { useNavigate } from '@tanstack/react-router'

import { useRef, useState } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { shop } from '@/features/catalog/seed'
import { useTourActions } from '@/features/tours/hooks/use-tours'
import { useBookingFormat } from './booking-summary'

export function useTourPayment(booking: TourBooking, now: Date): PaymentView {
  const { t } = useLocale()
  const { money, date } = useBookingFormat()
  const { pay } = useTourActions()
  const navigate = useNavigate()
  const [failed, setFailed] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const pendingRef = useRef(false)
  const [amount] = useState(() => bookingAmountDue(booking))
  const blocked
    = ['expired', 'cancelled', 'no_show', 'completed'].includes(booking.status)
      || (booking.status === 'pending_payment'
        && Date.parse(booking.holdUntil) <= now.getTime())
      || bookingAmountDue(booking) <= 0
  const processing = booking.payments.some(
    payment => payment.status === 'processing',
  )
  // When the hold ended (R06): the deadline, also after expiry cleared `holdUntil`.
  const holdEnded
    = booking.status === 'pending_payment'
      ? booking.holdUntil
      : booking.status === 'expired'
        ? booking.activity.find(event => event.event === 'expired')?.at
        : undefined
  const step: PaymentStep = blocked
    ? {
        kind: 'blocked',
        reason: holdEnded
          ? t('tourBooking.blockedExpired', { time: date(holdEnded) })
          : t('tourBooking.blocked'),
      }
    : processing
      ? { kind: 'processing' }
      : failed
        ? { kind: 'failed' }
        : { kind: 'choose' }
  const back = () =>
    void navigate({
      to: '/account/bookings/$bookingId',
      params: { bookingId: booking.id },
      replace: true,
    })
  const choose = async (outcome: Outcome) => {
    if (pendingRef.current)
      return
    pendingRef.current = true
    setIsPending(true)
    const result = await pay(booking.id, outcome)

    // The first payment confirms the booking (C13); a balance payment returns to C16.
    if (result.ok && outcome === 'succeeded') {
      if (booking.status === 'pending_payment') {
        void navigate({
          to: '/account/bookings/$bookingId/confirmed',
          params: { bookingId: booking.id },
          replace: true,
        })
      }
      else {
        back()
      }
    }
    else {
      if (result.ok && outcome === 'failed')
        setFailed(true)
      pendingRef.current = false
      setIsPending(false)
    }
  }

  return {
    seller: shop.name,
    ref: booking.ref,
    amount: money(amount),
    step,
    isPending,
    back,
    retry: () => setFailed(false),
    choose: outcome => void choose(outcome),
  }
}
