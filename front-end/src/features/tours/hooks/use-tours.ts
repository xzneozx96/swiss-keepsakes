import type {
  TourActionResult,
  TourBooking,
  TourData,
  TourDraft,
} from '@sk/domain/bookings'
import type {
  ExternalPaymentInput,
  TourOutcome,
} from '../merchant/lib/transitions'
import type { Outcome } from '@/features/payment/hooks/use-payment'

import { availableSeats, bookingAmountDue } from '@sk/domain/bookings'
import { useLocale } from '@/contexts/locale-context'
import { useCommand } from '@/features/data-client'
import { useDemoActions, useDemoSelector } from '@/features/demo'
import { demoNow } from '@/features/demo/clock'
import { useReferralVisits } from '@/features/partners/api/queries'
import { attributedPartnerId } from '@/features/partners/referral'

import { useSharedClock } from '@/hooks/use-shared-clock'
import { useTourRecords } from '../api/queries'
import { changeWithMails } from '../booking/booking-changes'
import {
  activeHold,
  applyProviderResult,
  expireLapsedHolds,
  missingParticipantInfo,
  newBooking,
  openPayment,
} from '../booking/transitions'
import {
  cancelOverdueBookings,
  externalPaymentBlock,
  outcomeBlock,
  sendTourReminders,
  skipPastBalanceDeadline,
} from '../merchant/lib/transitions'
import { createTourSeed } from '../seed'

const PHONE_SHAPE = /^\+?[\d ()-]{8,}$/

const fallback = createTourSeed()

/** The guest's booking in progress: browser state, kept in the store so a refresh keeps it. */
export function useTourDraft(): TourDraft {
  return useDemoSelector(s => s.data.tours?.draft ?? fallback.draft)
}

/** Only a countdown needs "second"; every other screen reads the clock to the minute. */
export function useTours(precision: 'minute' | 'second' = 'minute') {
  const data = useTourRecords()
  const draft = useTourDraft()
  const clockStartedAt = useDemoSelector(s => s.clockStartedAt)
  const guestId = useDemoSelector(s => s.data.signedInGuestId)
  const role = useDemoSelector(s => s.role)
  const tick = useSharedClock(precision === 'second' ? 1_000 : 60_000, clockStartedAt)

  return {
    data,
    ...data,
    draft,
    now: demoNow(clockStartedAt, tick),
    guestId,
    role,
  }
}

export function useTourActions() {
  const { update } = useDemoActions()
  const { mutate: addBooking } = useCommand('tours', 'createBooking')
  const { mutate: payBooking } = useCommand('tours', 'pay')
  const { mutate: recordBookingPayment } = useCommand('tours', 'recordPayment')
  const { mutate: recordBookingOutcome } = useCommand('tours', 'recordOutcome')
  const records = useTourRecords()
  const draft = useTourDraft()
  const clockStartedAt = useDemoSelector(s => s.clockStartedAt)
  const signedInGuestId = useDemoSelector(s => s.data.signedInGuestId)
  const referralVisits = useReferralVisits()
  const staffRole = useDemoSelector(s => s.role)
  const { language } = useLocale()
  const now = () => demoNow(clockStartedAt)
  // The draft, and the demo's provider, jobs and clock below, change the store directly; the
  // store bridge refreshes the screens. Guest and staff actions go through the data client.
  const change = (recipe: (data: TourData) => TourData) =>
    update(s => ({
      ...s,
      data: { ...s.data, tours: recipe(s.data.tours ?? createTourSeed()) },
    }))
  const updateDraft = (patch: Partial<TourDraft>) =>
    change(data => ({ ...data, draft: { ...data.draft, ...patch } }))
  const changeAndMail = (id: string, recipe: (data: TourData) => TourData) =>
    update(s => changeWithMails(s, id, recipe, language))
  /**
   * Checks the draft and sends the booking. Returns why it cannot be sent, or null when it was
   * sent; `onStored` runs once the command answered and `onFailed` if it failed, and only while
   * the screen is still open.
   */
  const createBooking = (
    onStored: (booking: { id: string, added: boolean }) => void,
    onFailed: () => void,
  ): { error: string, bookingId?: string } | null => {
    const guestId = signedInGuestId
    const tour = records.tours.find(t => t.id === draft.tourId)
    const departure = records.departures.find(
      d => d.id === draft.departureId && d.tourId === draft.tourId,
    )

    if (!guestId)
      return { error: 'sign-in' }
    if (
      !tour?.published
      || !departure
      || departure.closed
      || Date.parse(departure.startsAt) <= now().getTime()
    ) {
      return { error: 'departure' }
    }
    if (
      draft.adults < 1
      || [draft.adults, draft.children, draft.infants].some(
        n => !Number.isInteger(n) || n < 0,
      )
    ) {
      return { error: 'participants' }
    }
    const held = activeHold(records, guestId, departure.id, now())

    if (held)
      return { error: 'held', bookingId: held.id }
    if (
      draft.adults + draft.children
      > availableSeats(records, departure.id, now())
    ) {
      return { error: 'capacity' }
    }
    if (!draft.contactName.trim() || !PHONE_SHAPE.test(draft.phone))
      return { error: 'contact' }
    if (missingParticipantInfo(tour, draft.participantAnswers).length)
      return { error: 'participant-info' }
    const booking = newBooking({
      id: crypto.randomUUID(),
      tour,
      departure,
      draft,
      guestId,
      partnerId: attributedPartnerId(referralVisits, now()),
      language,
      now: now(),
    })

    // Rechecked on the latest data: if the seats went meanwhile, nothing is added and the review
    // page reports it.
    addBooking(
      { booking, language },
      {
        onSuccess: added => onStored({ id: booking.id, added }),
        onError: onFailed,
      },
    )

    return null
  }
  const modify = (id: string, recipe: (b: TourBooking) => TourBooking) =>
    change(data => ({
      ...data,
      bookings: data.bookings.map(b => (b.id === id ? recipe(b) : b)),
    }))
  const expireHolds = () => change(data => expireLapsedHolds(data, now()))
  /**
   * `onPaid` runs once the payment is stored and `onFailed` if it was not, and only while the
   * screen is still open.
   */
  const pay = (
    id: string,
    outcome: Outcome,
    onPaid: () => void,
    onFailed: () => void,
  ): TourActionResult => {
    const booking = records.bookings.find(b => b.id === id)

    if (
      !booking
      || booking.guestId !== signedInGuestId
      || ['expired', 'cancelled', 'completed', 'no_show'].includes(booking.status)
    ) {
      return { ok: false, reason: 'blocked' }
    }
    if (
      booking.status === 'pending_payment'
      && Date.parse(booking.holdUntil) <= now().getTime()
    ) {
      expireHolds()

      return { ok: false, reason: 'expired' }
    }
    if (booking.payments.some(p => p.status === 'processing'))
      return { ok: false, reason: 'processing' }
    const amount = bookingAmountDue(booking)

    if (amount <= 0)
      return { ok: false, reason: 'paid' }
    payBooking(
      { id, outcome, language },
      { onSuccess: onPaid, onError: onFailed },
    )

    return { ok: true }
  }
  /** Prototype provider: answers the booking's open online payment (late if the hold ended). */
  const resolvePayment = (
    id: string,
    outcome: 'succeeded' | 'failed',
    paidAt?: string,
  ): TourActionResult => {
    const booking = records.bookings.find(b => b.id === id)
    const payment = booking && openPayment(booking)

    if (!payment)
      return { ok: false, reason: 'no-open-payment' }
    changeAndMail(id, data =>
      applyProviderResult(
        data,
        id,
        payment.id,
        outcome,
        paidAt ?? now().toISOString(),
        now(),
      ))

    return { ok: true }
  }
  /** Prototype provider: sends its last answer again; an answered payment ignores it. */
  const repeatProviderResult = (id: string): TourActionResult => {
    const booking = records.bookings.find(b => b.id === id)
    const last = [...(booking?.payments ?? [])]
      .reverse()
      .find(p => p.method === 'online' && p.status !== 'processing')

    if (!last || last.status === 'processing')
      return { ok: false, reason: 'no-result' }
    const outcome = last.status

    changeAndMail(id, data =>
      applyProviderResult(data, id, last.id, outcome, last.at, now()))

    return { ok: false, reason: 'already-recorded' }
  }
  // Merchant actions (steps 2.11–2.14): guard on the screen's data, then the command re-checks
  // on the latest data, so a stale screen or double tap changes nothing.
  const recordPayment = (
    id: string,
    input: ExternalPaymentInput,
  ): TourActionResult => {
    const booking = records.bookings.find(b => b.id === id)
    const block = booking
      ? externalPaymentBlock(booking, input, staffRole, now())
      : { code: 'unavailable' }

    if (block)
      return { ok: false, reason: block.code }
    recordBookingPayment({ id, payment: input, language })

    return { ok: true }
  }
  const outcome = (id: string, result: TourOutcome): TourActionResult => {
    const booking = records.bookings.find(b => b.id === id)
    const block = booking
      ? outcomeBlock(booking, result, staffRole, now())
      : { code: 'unavailable' }

    if (block)
      return { ok: false, reason: block.code }
    recordBookingOutcome({ id, result, language })

    return { ok: true }
  }
  /** Balance-deadline check (R07): cancels only where the snapshotted policy says so. */
  const checkOverdue = () =>
    update(s =>
      cancelOverdueBookings(s, demoNow(s.clockStartedAt), language),
    )
  /** Prototype reminder run: N10 (proposed timing) and N13. */
  const sendReminders = () =>
    update(s => sendTourReminders(s, demoNow(s.clockStartedAt)))
  /** Prototype control: the demo clock skips past this booking's balance deadline. */
  const skipPastDeadline = (id: string) =>
    update(s => skipPastBalanceDeadline(s, id, language))
  const expireBooking = (id: string) =>
    modify(id, b =>
      b.status === 'pending_payment'
        ? { ...b, status: 'expired', holdUntil: null }
        : b)

  return {
    updateDraft,
    createBooking,
    expireHolds,
    pay,
    resolvePayment,
    repeatProviderResult,
    recordPayment,
    outcome,
    checkOverdue,
    sendReminders,
    skipPastDeadline,
    expireBooking,
  }
}
