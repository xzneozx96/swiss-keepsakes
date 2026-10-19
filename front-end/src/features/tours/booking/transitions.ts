import type {
  Departure,
  Tour,
  TourBooking,
  TourData,
  TourDraft,
  TourParticipants,
} from '@sk/domain/bookings'
import type { MailParams } from '@sk/domain/notifications'
import type { Language } from '@/contexts/locale-context'

import {
  availableSeats,
  bookingPaid,
  firstPaymentAmount,
  tourTotal,
} from '@sk/domain/bookings'

/** R06: the first full or deposit payment holds the seats for 15 minutes from creation. */
export const HOLD_MINUTES = 15

export type ProviderOutcome = 'succeeded' | 'failed'

function holdLapsed(booking: TourBooking, now: Date) {
  return booking.status === 'pending_payment'
    && Date.parse(booking.holdUntil) <= now.getTime()
}

export function openPayment(booking: TourBooking) {
  return booking.payments.find(payment => payment.status === 'processing')
}

/**
 * A new booking with its prices, policies, referral source and hold deadline snapshotted at
 * creation (AC11, AC15).
 */
export function newBooking({
  id,
  tour,
  departure,
  draft,
  guestId,
  partnerId,
  language,
  now,
}: {
  id: string
  tour: Tour
  departure: Departure
  draft: TourParticipants
    & Pick<
      TourDraft,
      'contactName' | 'phone' | 'childName' | 'participantAnswers'
    >
  guestId: string
  partnerId: string | null
  language: Language
  now: Date
}): TourBooking {
  const at = now.toISOString()
  const total = tourTotal(tour, draft)
  const record = {
    id,
    ref: `SK-T${id.slice(0, 6).toUpperCase()}`,
    guestId,
    language,
    tourId: tour.id,
    departureId: departure.id,
    adults: draft.adults,
    children: draft.children,
    infants: draft.infants,
    contactName: draft.contactName.trim(),
    phone: draft.phone.trim(),
    childName: draft.childName,
    participantInfo: tour.participantFields
      .map(field => ({
        label: structuredClone(field.label),
        value: draft.participantAnswers?.[field.id]?.trim() ?? '',
      }))
      .filter(answer => answer.value),
    tourName: structuredClone(tour.name),
    meetingPoint: structuredClone(tour.meetingPoint),
    startsAt: departure.startsAt,
    endsAt: new Date(
      Date.parse(departure.startsAt) + tour.durationMinutes * 60000,
    ).toISOString(),
    total,
    firstAmount: firstPaymentAmount(departure.policy, total),
    adultPrice: tour.adultPrice,
    childPrice: tour.childPrice,
    infantPrice: tour.infantPrice,
    cancellationPolicy: structuredClone(tour.cancellationPolicy),
    policy: departure.policy,
    balanceDueAt: departure.balanceDueAt,
    overduePolicy: structuredClone(departure.overduePolicy),
    partnerId,
    commissionRate: tour.commissionRate,
    createdAt: at,
    payments: [],
    activity: [{ at, event: 'created', actor: 'guest' }],
    commissionRecordedAt: null,
  }

  return departure.policy === 'later'
    ? { ...record, status: 'confirmed', holdUntil: null }
    : {
        ...record,
        status: 'pending_payment',
        holdUntil: new Date(now.getTime() + HOLD_MINUTES * 60000).toISOString(),
      }
}

/** Adds the booking only if its seats still fit when the change is applied (AC05). */
export function addBooking(
  data: TourData,
  booking: TourBooking,
  now: Date,
): TourData {
  return booking.adults + booking.children
    > availableSeats(data, booking.departureId, now)
    ? data
    : { ...data, bookings: [...data.bookings, booking] }
}

/** Required participant questions of the tour that the draft leaves empty. */
export function missingParticipantInfo(
  tour: Tour,
  answers: Record<string, string> = {},
): string[] {
  return tour.participantFields
    .filter(field => field.required && !answers[field.id]?.trim())
    .map(field => field.id)
}

/** The guest's own hold on this departure that is still running, if any. */
export function activeHold(
  data: TourData,
  guestId: string,
  departureId: string,
  now: Date,
): TourBooking | undefined {
  return data.bookings.find(
    b =>
      b.guestId === guestId
      && b.departureId === departureId
      && b.status === 'pending_payment'
      && !holdLapsed(b, now),
  )
}

/**
 * Ends every hold whose 15 minutes have passed (R06). Seats are released by the status change
 * itself, so this can run any number of times. An open payment's session is closed at the
 * deadline; a provider result for it can still arrive and is handled as late.
 */
export function expireLapsedHolds(data: TourData, now: Date): TourData {
  let changed = false
  const bookings = data.bookings.map((b): TourBooking => {
    if (b.status !== 'pending_payment' || !holdLapsed(b, now))
      return b
    changed = true
    const at = b.holdUntil

    return {
      ...b,
      status: 'expired',
      holdUntil: null,
      activity: [
        ...b.activity,
        { at, event: 'expired', actor: 'system' },
        ...(openPayment(b)
          ? [{ at, event: 'session-closed', actor: 'system' }]
          : []),
      ],
    }
  })

  return changed ? { ...data, bookings } : data
}

/**
 * The provider answers one open online payment. A payment that is no longer open ignores the
 * answer, so a repeated result never counts money twice. The hold is judged when the result
 * arrives (`now`), never by the reported payment time: a success after the deadline keeps the
 * booking expired and stays visible for reconciliation with both times (spec §2.2, R06).
 */
export function applyProviderResult(
  data: TourData,
  bookingId: string,
  paymentId: string,
  outcome: ProviderOutcome,
  paidAt: string,
  now: Date,
): TourData {
  const current = expireLapsedHolds(data, now)
  const booking = current.bookings.find(b => b.id === bookingId)
  const payment = booking?.payments.find(
    p => p.id === paymentId && p.status === 'processing',
  )

  if (!booking || !payment)
    return current
  const receivedAt = now.toISOString()
  const late = booking.status === 'expired'
  const next = {
    ...booking,
    payments: booking.payments.map(p =>
      p.id === paymentId
        ? {
            ...p,
            status: outcome,
            at: outcome === 'succeeded' ? paidAt : receivedAt,
          }
        : p,
    ),
    lateResults: late
      ? [
          ...(booking.lateResults ?? []),
          {
            paymentId,
            paidAt: outcome === 'succeeded' ? paidAt : null,
            receivedAt,
          },
        ]
      : booking.lateResults,
    activity: [
      ...booking.activity,
      {
        at: receivedAt,
        event: late ? `payment-late-${outcome}` : `payment-${outcome}`,
        actor: 'provider',
      },
    ],
  }
  const confirmed: TourBooking
    = next.status === 'pending_payment'
      && outcome === 'succeeded'
      && bookingPaid(next) >= next.firstAmount
      ? { ...next, status: 'confirmed', holdUntil: null }
      : next

  return {
    ...current,
    bookings: current.bookings.map(b => (b.id === bookingId ? confirmed : b)),
  }
}

/**
 * The emails one booking's change sends (spec §6), read from the booking before and after:
 * N07 receipt, N08 failed payment, N09 confirmed, and N22 to guest and staff for money that
 * arrived after the hold expired. A change that adds no payment result or confirmation sends
 * nothing, so a repeated provider result stays silent.
 */
export function bookingMails(
  before: TourBooking | undefined,
  after: TourBooking,
): {
  to: 'guest' | 'staff'
  template: 'N07' | 'N08' | 'N09' | 'N22'
  params: MailParams
}[] {
  const was = new Map(before?.payments.map(p => [p.id, p.status]))
  const mails: ReturnType<typeof bookingMails> = []

  for (const p of after.payments) {
    if (was.get(p.id) === p.status)
      continue
    const amount = { amount: p.amount }

    if (p.status === 'succeeded' && after.status === 'expired') {
      mails.push(
        { to: 'guest', template: 'N22', params: amount },
        { to: 'staff', template: 'N22', params: amount },
      )
    }
    else if (p.status === 'succeeded') {
      mails.push({ to: 'guest', template: 'N07', params: amount })
    }
    else if (p.status === 'failed' && after.status !== 'expired') {
      mails.push({
        to: 'guest',
        template: 'N08',
        params:
          after.status === 'pending_payment'
            ? { ...amount, holdUntil: after.holdUntil }
            : amount,
      })
    }
  }
  if (after.status === 'confirmed' && before?.status !== 'confirmed')
    mails.push({ to: 'guest', template: 'N09', params: {} })

  return mails
}

/** Prototype only: another guest holds enough seats that this group no longer fits (AC05). */
export function competingHold(
  data: TourData,
  tour: Tour,
  departure: Departure,
  groupSeats: number,
  now: Date,
): TourData {
  const left = availableSeats(data, departure.id, now)
  const seats = Math.max(1, left - Math.max(0, groupSeats - 1))

  if (left < 1)
    return data

  return addBooking(
    data,
    newBooking({
      id: crypto.randomUUID(),
      tour,
      departure,
      draft: {
        adults: seats,
        children: 0,
        infants: 0,
        contactName: 'Tom Becker',
        phone: '+49 151 555 0143',
        childName: '',
      },
      guestId: 'g-tom',
      partnerId: null,
      language: 'de',
      now,
    }),
    now,
  )
}
