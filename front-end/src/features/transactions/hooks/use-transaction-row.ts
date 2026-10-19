import type { Order } from '@sk/domain/orders'
import type { ShownLabel } from '@/features/orders/hooks/use-orders'

import { formatOrderDate, pickupChangedBySeller } from '@sk/domain/orders'
import { formatMoney, pickText, pickupDay } from '@sk/domain/shared'
import { useLocale } from '@/contexts/locale-context'
import { useDemoSelector } from '@/features/demo'
import { useOrderSummary } from '@/features/orders/hooks/use-orders'
import { cancelBlock } from '@/features/orders/lib/transitions'

/** Orders that need nothing more from the guest or the shop: C14 lists them under "Past". */
export function isClosedOrder(order: Order) {
  return order.status === 'completed'
    || order.status === 'declined'
    || order.status === 'cancelled'
}

export interface TransactionRowView {
  id: string
  ref: string
  photo?: string
  /** First line's product as ordered (AC15), plus "+N more" for further lines. */
  title: string
  amount: string
  /** "SK-1012 · Pickup 09.10.2026". */
  meta: string
  /** Date tile of the pickup ticket, e.g. Wed / 21 / Oct. */
  pickupDay: { weekday: string, day: string, month: string }
  place: string
  progress: ShownLabel
  payment: ShownLabel
  /** R04: the seller changed the requested date or place, and the guest can still cancel. */
  changedNote?: string
}

/** One C14 row: product, amount, reference, pickup date and place, and both labels from T0. */
export function useTransactionRow(order: Order): TransactionRowView {
  const { t, language, intlLocale } = useLocale()
  const pickupPlaces = useDemoSelector(s => s.data.pickupPlaces)
  const products = useDemoSelector(s => s.data.products)
  const summary = useOrderSummary(order, 'guest')
  const [first, ...rest] = order.lines
  const product = products.find(p => p.id === first.productId)
  const name = pickText(first.productName, language).text
  const place = pickupPlaces.find(p => p.id === order.pickupPlaceId)

  return {
    id: order.id,
    ref: order.ref,
    photo: product?.photo,
    title:
      rest.length > 0
        ? t('transactions.row.more', { name, count: rest.length })
        : name,
    amount: formatMoney(summary.total / 100, intlLocale),
    meta: `${order.ref} · ${t('transactions.row.pickup', {
      date: formatOrderDate(order.pickupDate, intlLocale),
    })}`,
    pickupDay: pickupDay(order.pickupDate, intlLocale),
    place: place ? pickText(place.name, language).text : order.pickupPlaceId,
    progress: summary.progress,
    payment: summary.payment,
    changedNote:
      pickupChangedBySeller(order) && !cancelBlock(order, 'guest')
        ? t('transactions.row.changedNote')
        : undefined,
  }
}
