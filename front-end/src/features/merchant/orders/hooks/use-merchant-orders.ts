import type { OrderRowProps } from '../components/order-rows'
import type { OrderTabId } from '../lib/order-tabs'
import type { OrderLabel } from '@/features/orders/lib/labels'
import type { Order } from '@/features/orders/types'
import type { MessageKey } from '@/i18n/en'

import { useLocale } from '@/contexts/locale-context'

import { zurichDate } from '@/features/catalog/lib/pickup'
import { useDemo, useDemoNow } from '@/features/demo'
import {
  formatOrderDate,
  formatOrderDateTime,
} from '@/features/orders/lib/format'
import {
  formatLabel,
  paymentLabel,
  progressLabel,
} from '@/features/orders/lib/labels'
import { orderTotal } from '@/features/orders/lib/selectors'
import {
  calendarDay,
  dateTimeFormat,
  formatMoney,
  formatShortDate,
} from '@/lib/format'
import { pickText } from '@/lib/localized'
import { ORDER_TABS, orderTab } from '../lib/order-tabs'

const tabLabels: Record<OrderTabId, MessageKey> = {
  'awaiting-confirmation': 'merchantOrders.tab.awaitingConfirmation',
  'awaiting-payment': 'merchantOrders.tab.awaitingPayment',
  'preparing': 'merchantOrders.tab.preparing',
  'ready': 'merchantOrders.tab.ready',
  'owing': 'merchantOrders.tab.owing',
  'completed': 'merchantOrders.tab.completed',
  'cancelled': 'merchantOrders.tab.cancelled',
}

const closedTabs: OrderTabId[] = ['completed', 'cancelled']

/** The phone card's short payment status; the amounts and due date get their own rows. */
const paymentStatus: Partial<Record<MessageKey, MessageKey>> = {
  'order.payment.notDue': 'merchantOrders.card.payment.notDue',
  'order.payment.none': 'merchantOrders.card.payment.none',
  'order.payment.paid': 'merchantOrders.card.payment.paid',
  'order.payment.due': 'merchantOrders.card.payment.due',
  'order.payment.overdue': 'merchantOrders.card.payment.overdue',
  'order.payment.processing': 'merchantOrders.card.payment.processing',
  'order.payment.paidInFull': 'merchantOrders.card.payment.paidInFull',
  'order.payment.depositPaid': 'merchantOrders.card.payment.depositPaid',
  'order.payment.partPaidDue': 'merchantOrders.card.payment.partPaidDue',
  'order.payment.partPaid': 'merchantOrders.card.payment.partPaid',
  'order.payment.payLater': 'merchantOrders.card.payment.payLater',
  'order.payment.owed': 'merchantOrders.card.payment.owed',
  'order.payment.afterCancellation':
    'merchantOrders.card.payment.afterCancellation',
}

/** Row labels for the values inside a payment label (`paymentLabel` vars). */
const factLabels: Record<string, MessageKey> = {
  paid: 'merchantOrders.card.fact.paid',
  balance: 'merchantOrders.card.fact.balance',
  amount: 'merchantOrders.card.fact.amount',
  due: 'merchantOrders.card.fact.due',
}

/**
 * M04 is built in step 1.11, so its route is not in the typed route tree yet. Hash history
 * follows a plain anchor; 1.11 can swap this for a typed Link to /store/orders/$orderId.
 */
export const orderDetailHref = (order: Order) => `#/store/orders/${order.id}`

/**
 * M03 Gift orders: tab labels with counts and the selected tab's rows. Open tabs list the
 * soonest pickup first; completed and cancelled list the latest pickup first.
 */
export function useMerchantOrders(selected: OrderTabId) {
  const { t, language, intlLocale } = useLocale()
  const { state } = useDemo()
  const now = useDemoNow()
  const { orders, guests, products, pickupPlaces } = state.data
  const today = zurichDate(now)
  const shown = (label: OrderLabel) => ({
    text: formatLabel(label, t, intlLocale),
    tone: label.tone,
  })
  const datePart = (iso: string, option: Intl.DateTimeFormatOptions) =>
    dateTimeFormat(intlLocale, { ...option, timeZone: 'UTC' }).format(
      calendarDay(iso),
    )
  const factValue = (value: NonNullable<OrderLabel['vars']>[string]) =>
    typeof value !== 'object'
      ? String(value)
      : 'money' in value
        ? formatMoney(value.money / 100, intlLocale)
        : 'date' in value
          ? formatOrderDate(value.date, intlLocale)
          : formatOrderDateTime(value.dateTime, intlLocale)

  const toRow = (order: Order): OrderRowProps => {
    const [first, ...rest] = order.lines
    const product = first ? pickText(first.productName, language).text : ''
    const place = pickupPlaces.find(p => p.id === order.pickupPlaceId)
    const payment = paymentLabel(order, now)
    const status = paymentStatus[payment.key]

    return {
      id: order.id,
      href: orderDetailHref(order),
      reference: order.ref,
      guestName: guests.find(g => g.id === order.guestId)?.name ?? '',
      gifts: rest.length
        ? t('merchantOrders.giftsMore', {
            product,
            quantity: first.quantity,
            count: rest.length,
          })
        : t('merchantOrders.gifts', {
            product,
            quantity: first?.quantity ?? 0,
          }),
      giftLines: order.lines.map((line) => {
        const lineProduct = products.find(p => p.id === line.productId)
        // One-variant gifts carry a "Standard" label that says nothing, so it is left out.
        const variant
          = lineProduct && lineProduct.variants.length > 1
            ? pickText(line.variantLabel, language).text
            : ''
        const engraving = line.engraving
          ? t('cart.line.engraving', { text: line.engraving })
          : ''

        return {
          id: line.id,
          name: pickText(line.productName, language).text,
          meta: [variant, engraving].filter(Boolean).join(' · '),
          quantity: line.quantity,
          photo: lineProduct?.photo,
        }
      }),
      total: formatMoney(orderTotal(order) / 100, intlLocale),
      progress: shown(progressLabel(order, 'staff')),
      payment: shown(payment),
      paymentStatus: status ? t(status) : formatLabel(payment, t, intlLocale),
      paymentFacts: Object.entries(payment.vars ?? {}).map(([name, value]) => ({
        label: factLabels[name] ? t(factLabels[name]) : name,
        value: factValue(value),
      })),
      pickupDate: formatShortDate(order.pickupDate, today, intlLocale),
      pickupDay: {
        weekday: datePart(order.pickupDate, { weekday: 'short' }),
        day: datePart(order.pickupDate, { day: 'numeric' }),
        month: datePart(order.pickupDate, { month: 'short' }),
      },
      pickupPlace: place ? pickText(place.name, language).text : '',
    }
  }

  const direction = closedTabs.includes(selected) ? -1 : 1
  const rows = orders
    .filter(o => orderTab(o) === selected)
    .sort(
      (a, b) =>
        direction * a.pickupDate.localeCompare(b.pickupDate)
        || a.ref.localeCompare(b.ref),
    )
    .map(toRow)

  return {
    tabs: ORDER_TABS.map(id => ({
      id,
      label: t(tabLabels[id]),
      count: orders.filter(o => orderTab(o) === id).length,
    })),
    rows,
  }
}
