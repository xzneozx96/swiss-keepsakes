import type { TripAnswers, TripRecord } from '@sk/domain/orders'
import type { DemoData, QueriedData } from '@/features/demo/types'

import { zurichDate } from '@sk/domain/catalog'

export type TripStatus = 'open' | 'answered' | 'skipped'

/**
 * The purchase the trip answers belong to (2.17): the orders from one C07 send, or one tour
 * booking. Orders carry no shared send id, so C15 targets its own order only.
 */
export type TripTarget
  = { kind: 'gift', orderIds: string[] } | { kind: 'tour', bookingId: string }

export function hasTripAnswers(trip?: TripAnswers) {
  return !!trip && !!(trip.travelStyle || trip.arriveOn || trip.leaveOn)
}

export function tripStatus(trip?: TripRecord): TripStatus {
  return hasTripAnswers(trip) ? 'answered' : trip?.skippedAt ? 'skipped' : 'open'
}

function answersOf(trip?: TripRecord): TripAnswers {
  return {
    travelStyle: trip?.travelStyle,
    arriveOn: trip?.arriveOn,
    leaveOn: trip?.leaveOn,
  }
}

/** One of the guest's orders or bookings, with the day it happens (pickup or tour date). */
interface Purchase {
  key: string
  trip?: TripRecord
  day: string
}

/** The guest's orders and tour bookings, which the trip questions are asked about. */
type Purchases = Pick<QueriedData, 'orders' | 'tours'>

function guestPurchases(data: Purchases, guestId: string): Purchase[] {
  return [
    ...data.orders
      .filter(o => o.guestId === guestId)
      .map(o => ({ key: `gift:${o.id}`, trip: o.trip, day: o.pickupDate })),
    ...(data.tours?.bookings ?? [])
      .filter(b => b.guestId === guestId)
      .map(b => ({
        key: `tour:${b.id}`,
        trip: b.trip,
        day: zurichDate(new Date(b.startsAt)),
      })),
  ]
}

function targetKeys(target: TripTarget) {
  return target.kind === 'gift'
    ? target.orderIds.map(id => `gift:${id}`)
    : [`tour:${target.bookingId}`]
}

/**
 * The trip state of a purchase for the signed-in guest. Answered shows its own answers. Otherwise
 * the form starts with the newest answers of another of the guest's purchases whose arrival and
 * departure both cover every day of this one (inclusive), or blank.
 */
export function tripView(
  data: Purchases,
  guestId: string | null,
  target: TripTarget,
): { status: TripStatus, answers: TripAnswers } {
  const keys = new Set(targetKeys(target))
  const all = guestId ? guestPurchases(data, guestId) : []
  const own = all.filter(p => keys.has(p.key))
  const trip = own.find(p => hasTripAnswers(p.trip))?.trip ?? own[0]?.trip
  const status = tripStatus(trip)

  if (status === 'answered')
    return { status, answers: answersOf(trip) }

  const covers = ({ arriveOn, leaveOn }: TripRecord = {}) =>
    !!arriveOn
    && !!leaveOn
    && own.every(p => arriveOn <= p.day && p.day <= leaveOn)
  const covering = own.length
    ? all
      .filter(p => !keys.has(p.key) && covers(p.trip))
      .sort((a, b) =>
        (b.trip?.answeredAt ?? '').localeCompare(a.trip?.answeredAt ?? ''),
      )[0]
    : undefined

  return { status, answers: covering ? answersOf(covering.trip) : {} }
}

/** Stores the same trip record on every order or the booking of the target (the guest's own only). */
export function withTrip(
  data: DemoData,
  guestId: string,
  target: TripTarget,
  trip: TripRecord,
): DemoData {
  if (target.kind === 'gift') {
    const ids = new Set(target.orderIds)

    return {
      ...data,
      orders: data.orders.map(o =>
        ids.has(o.id) && o.guestId === guestId ? { ...o, trip } : o,
      ),
    }
  }

  if (!data.tours)
    return data

  return {
    ...data,
    tours: {
      ...data.tours,
      bookings: data.tours.bookings.map(b =>
        b.id === target.bookingId && b.guestId === guestId ? { ...b, trip } : b,
      ),
    },
  }
}
