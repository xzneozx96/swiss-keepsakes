import type { CalendarItem, PickupItem } from './calendar-core'

import { pickText } from '@sk/domain/shared'

import { useMemo } from 'react'
import { useLocale } from '@/contexts/locale-context'
import { useGuests } from '@/features/account/api/queries'
import { usePickupPlaces } from '@/features/catalog/api/queries'
import { useDemoNow } from '@/features/demo'
import { useOrders } from '@/features/orders/api/queries'
import {
  formatLabel,
  paymentLabel,
  progressLabel,
} from '@/features/orders/lib/labels'
import { swissDate, zurichLocal } from './calendar-core'

/**
 * What the calendar shows, from the same state the departure and order screens read: one event
 * per keepsake order on its pickup date (declined and cancelled ones left out). Tour
 * departures are dormant (ADR-012). Today comes from the demo clock, to the minute.
 */
export function useCalendarItems() {
  const { t, language, intlLocale } = useLocale()
  const now = useDemoNow()
  const minute = Math.floor(now.getTime() / 60_000)
  const orders = useOrders()
  const guests = useGuests()
  const pickupPlaces = usePickupPlaces()

  const items = useMemo(() => {
    const clock = new Date(minute * 60_000)
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

    return pickups as CalendarItem[]
  }, [orders, guests, pickupPlaces, minute, language, intlLocale, t])

  const clock = new Date(minute * 60_000)

  return {
    items,
    today: swissDate(clock),
    /** The calendar's "now", as Zurich wall-clock time. */
    now: zurichLocal(clock),
  }
}
