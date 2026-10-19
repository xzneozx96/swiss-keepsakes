import type {
  CalendarItem,
  PickupItem,
  ShownLabel,
  TourItem,
} from './calendar-core'

import { departureSeats } from '@sk/domain/bookings'

import { formatMoney, pickText } from '@sk/domain/shared'

import { useMemo } from 'react'
import { useLocale } from '@/contexts/locale-context'
import { useDemo } from '@/features/demo'
import {
  formatLabel,
  paymentLabel,
  progressLabel,
} from '@/features/orders/lib/labels'
import { useTours } from '@/features/tours/hooks/use-tours'
import {
  departureBookings,
  departureEnd,
  departurePhase,
  tourWork,
} from '@/features/tours/merchant/lib/work'
import { phaseChip } from '@/features/tours/merchant/shared'
import { swissDate, zurichLocal } from './calendar-core'

/**
 * What the calendar shows, from the same state the departure and order screens read: one event
 * per tour departure (cancelled ones left out) and one per keepsake order on its pickup date
 * (declined and cancelled ones left out). Today comes from the demo clock, to the minute.
 */
export function useCalendarItems() {
  const { t, language, intlLocale } = useLocale()
  const { state } = useDemo()
  const { data, now } = useTours()
  const minute = Math.floor(now.getTime() / 60_000)
  const { orders, guests, pickupPlaces } = state.data

  const items = useMemo(() => {
    const clock = new Date(minute * 60_000)
    const tours: TourItem[] = data.departures.flatMap((departure) => {
      const tour = data.tours.find(entry => entry.id === departure.tourId)

      if (!tour || departure.cancelledAt)
        return []
      const seats = departureSeats(data, departure.id, clock)
      const bookings = departureBookings(data, departure.id)
      const active = bookings
        .filter(
          b =>
            !['pending_payment', 'expired', 'cancelled'].includes(b.status),
        )
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      const start = new Date(departure.startsAt)
      const stop = new Date(departureEnd(departure, tour))
      const phase = phaseChip[departurePhase(departure, tour, clock)]
      const owed = tourWork(bookings, clock).toCollect
      const payment: ShownLabel
        = owed > 0
          ? {
              text: `${t('tourMerchant.toCollect')}: ${formatMoney(owed / 100, intlLocale)}`,
              tone: 'warning',
            }
          : active.length
            ? { text: t('tours.payment.paid'), tone: 'success' }
            : { text: t('tours.payment.none'), tone: 'neutral' }
      const startLocal = zurichLocal(start)
      const stopLocal = zurichLocal(stop)

      return {
        kind: 'tour',
        id: `tour:${departure.id}`,
        departureId: departure.id,
        title: pickText(tour.name, language).text,
        date: swissDate(start),
        time: startLocal.slice(11, 16),
        end: stopLocal.slice(11, 16),
        start: startLocal,
        stop: stopLocal,
        booked: seats.confirmed,
        held: seats.held,
        capacity: seats.capacity,
        lead: active[0]?.contactName ?? '',
        more: Math.max(0, active.length - 1),
        meetingPoint: pickText(tour.meetingPoint, language).text,
        phase: { text: t(phase.key), tone: phase.tone },
        payment,
      } satisfies TourItem
    })
    const pickups: PickupItem[] = orders
      .filter(o => o.status !== 'declined' && o.status !== 'cancelled')
      .map((order) => {
        const [first, ...rest] = order.lines
        const product = first ? pickText(first.productName, language).text : ''
        const shown = (label: ReturnType<typeof progressLabel>) => ({
          text: formatLabel(label, t, intlLocale),
          tone: label.tone,
        })
        const place = pickupPlaces.find(p => p.id === order.pickupPlaceId)

        return {
          kind: 'pickup',
          id: `order:${order.id}`,
          orderId: order.id,
          ref: order.ref,
          title: rest.length
            ? t('calendar.plusMore', { name: product, count: rest.length })
            : product,
          date: order.pickupDate,
          customer: guests.find(g => g.id === order.guestId)?.name ?? '',
          quantity: order.lines.reduce((sum, line) => sum + line.quantity, 0),
          place: place ? pickText(place.name, language).text : '',
          requested: order.status === 'requested',
          progress: shown(progressLabel(order, 'staff')),
          payment: shown(paymentLabel(order, clock)),
        } satisfies PickupItem
      })

    return [...tours, ...pickups] as CalendarItem[]
  }, [data, orders, guests, pickupPlaces, minute, language, intlLocale, t])

  const clock = new Date(minute * 60_000)

  return {
    items,
    today: swissDate(clock),
    /** The calendar's "now", as Zurich wall-clock time. */
    now: zurichLocal(clock),
  }
}
