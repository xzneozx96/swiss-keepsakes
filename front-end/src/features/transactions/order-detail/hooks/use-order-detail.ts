import type { PickupPlace } from '@sk/domain/catalog'
import type { LogEntry, Order, Payment } from '@sk/domain/orders'
import type { ShownLabel } from '@/features/orders/hooks/use-orders'
import type { MessageKey } from '@/i18n/en'

import {
  amountDueNow,
  firstPaymentAmount,
  formatOrderDate,
  formatOrderDateTime,
  lineTotal,
  orderTotal,
  paymentsAfterCancellation,
  pickupChangedBySeller,
} from '@sk/domain/orders'

import { formatMoney, pickText, pickupDay } from '@sk/domain/shared'
import { useNavigate } from '@tanstack/react-router'
import { useLocale } from '@/contexts/locale-context'
import { useCart } from '@/features/cart/hooks/use-cart'
import { usePickupPlaces, useProducts } from '@/features/catalog/api/queries'
import { shop } from '@/features/catalog/seed'
import { useDemoSelector } from '@/features/demo'
import { useOrders } from '@/features/orders/api/queries'
import {
  useOrderActions,
  useOrderSummary,
} from '@/features/orders/hooks/use-orders'
import {
  cancelBlock,
  startOnlinePaymentBlock,
} from '@/features/orders/lib/transitions'

const WHITESPACE = /\s/g

export interface OrderNotice {
  status: 'default' | 'warning' | 'danger' | 'success'
  title: string
  body?: string
  /** Set when the notice rests on an undecided UX proposal (spec §7). */
  proposal?: string
}

export interface TimelineStep {
  text: string
  /** Set for steps that happened; upcoming steps have none. */
  time?: string
}

export interface OrderDetailView {
  /** The order's id: its trip answers are kept on it (2.17). */
  id: string
  ref: string
  title: string
  photo?: string
  progress: ShownLabel
  payment: ShownLabel
  /** Declined or cancelled: nothing is still to happen. */
  closed: boolean
  /** The pickup date as a calendar tile: "Wed", "21", "Oct". */
  pickupDay: { weekday: string, day: string, month: string }
  /** The first notice is the header's headline; the rest sit under it. */
  notices: OrderNotice[]
  actions: {
    pay?: { label: string, orderId: string }
    cancel?: { onConfirm: () => void }
    requestAgain?: { onPress: () => void }
    /** Completed orders only (AC17): the order C18 reviews. */
    review?: Order
  }
  pickup: {
    title: string
    date: string
    place: string
    address: string
    hours: string
    instructions: string
  }
  items: {
    id: string
    name: string
    detail: string
    photo?: string
    total: string
  }[]
  amounts: { label: string, value: string, strong?: boolean }[]
  payments: { id: string, amount: string, meta: string, status: ShownLabel }[]
  timeline: TimelineStep[]
  policy: {
    payment: string
    cancellation: string
    cancellationNotice?: string
  }
  contact: { emailHref: string, callHref: string }
}

function placeName(places: PickupPlace[], id: string, language: 'en' | 'de') {
  const place = places.find(p => p.id === id)

  return place ? pickText(place.name, language).text : id
}

const progressOrder: Order['status'][] = [
  'requested',
  'accepted',
  'preparing',
  'ready',
  'handed_over',
  'completed',
]

/** Milestones still ahead of an open order, each with the status it leads to. */
function upcomingKeys(order: Order): MessageKey[] {
  const payLater = order.paymentPolicy.kind === 'later'
  // Pay later skips "accepted": the seller's confirmation leads straight to preparing (AC07).
  const milestones: [Order['status'], MessageKey][] = payLater
    ? [['preparing', 'guestOrder.timeline.next.confirm']]
    : [
        ['accepted', 'guestOrder.timeline.next.confirm'],
        ['preparing', 'guestOrder.timeline.next.pay'],
      ]

  milestones.push(
    ['ready', 'guestOrder.timeline.next.ready'],
    ['completed', 'guestOrder.timeline.next.done'],
  )
  const at = progressOrder.indexOf(order.status)

  return milestones
    .filter(([status]) => progressOrder.indexOf(status) > at)
    .map(([, key]) => key)
}

/** The signed-in guest's own order, or undefined (other guests' orders stay private, spec §1.7). */
export function useOwnOrder(orderId: string): Order | undefined {
  const guestId = useDemoSelector(s => s.data.signedInGuestId)

  return useOrders(orders =>
    orders.find(o => o.id === orderId && o.guestId === guestId),
  )
}

/** C15 Order detail: both labels, the state's notice and actions, pickup, money, log, policy. */
export function useOrderDetail(order: Order): OrderDetailView {
  const { t, language, intlLocale } = useLocale()
  const products = useProducts()
  const places = usePickupPlaces()
  const actions = useOrderActions()
  const cart = useCart()
  const navigate = useNavigate()
  const summary = useOrderSummary(order)
  const money = (rappen: number) => formatMoney(rappen / 100, intlLocale)
  const dateTime = (iso: string) => formatOrderDateTime(iso, intlLocale)
  const date = (iso: string) => formatOrderDate(iso, intlLocale)
  const pick = (text: Partial<Record<'en' | 'de', string>>) =>
    pickText(text, language).text
  const payment = (id: string) => order.payments.find(p => p.id === id)
  const [first, ...rest] = order.lines
  const firstName = pick(first.productName)
  const place = places.find(p => p.id === order.pickupPlaceId)
  const status = order.status
  const closed = status === 'declined' || status === 'cancelled'
  const latePayments = paymentsAfterCancellation(order)
  const cancelEntry = [...order.log]
    .reverse()
    .find(e => e.type === 'cancelled')
  const cancelReason
    = cancelEntry?.type === 'cancelled' ? cancelEntry.reason : undefined
  const change = [...order.log]
    .reverse()
    .find(
      (e): e is Extract<LogEntry, { type: 'pickup-changed' }> =>
        e.type === 'pickup-changed',
    )

  // --- notices (one per state, plus the R04 note) ---------------------------
  const notices: OrderNotice[] = []
  const canCancel = !cancelBlock(order, 'guest')

  if (status === 'requested') {
    notices.push({
      status: 'default',
      title: t('guestOrder.notice.requested.title'),
      body: t('guestOrder.notice.requested.body'),
    })
  }
  if (!closed && summary.isProcessing) {
    notices.push({
      status: 'default',
      title: t('guestOrder.notice.processing.title'),
      body: t('guestOrder.notice.processing.body'),
    })
  }
  else if (status === 'accepted' && order.firstPaymentDueAt) {
    notices.push({
      status: 'warning',
      // The payment chip carries the amount and deadline; the headline says what's at stake.
      title: t('guestOrder.notice.payDue.title'),
      body: t('guestOrder.notice.payDue.body'),
    })
  }
  // R04 (UX proposal): the shop changed the request, so cancelling before paying is free.
  if (change && pickupChangedBySeller(order) && canCancel) {
    notices.push({
      status: 'default',
      title:
        change.field === 'date'
          ? t('guestOrder.notice.changed.date', {
              from: date(change.from),
              to: date(change.to),
            })
          : t('guestOrder.notice.changed.place', {
              from: placeName(places, change.from, language),
              to: placeName(places, change.to, language),
            }),
      body: t('guestOrder.notice.changed.body'),
      proposal: t('transactions.proposal.freeCancel'),
    })
  }
  if (status === 'preparing') {
    notices.push({
      status: 'default',
      title: t('guestOrder.notice.preparing.title'),
      body: t('guestOrder.notice.preparing.body', {
        date: date(order.pickupDate),
      }),
    })
  }
  if (status === 'ready') {
    notices.push({
      status: 'success',
      title: t('guestOrder.notice.ready.title', {
        place: placeName(places, order.pickupPlaceId, language),
      }),
      body: place ? pick(place.instructions) : undefined,
    })
  }
  if (status === 'handed_over' && summary.balance > 0) {
    notices.push({
      status: 'warning',
      // The payment chip carries the amount and due date; the headline says how to pay.
      title: t('guestOrder.notice.balance.title'),
      body: t('guestOrder.notice.balance.body'),
    })
  }
  if (status === 'completed') {
    notices.push({
      status: 'success',
      title: t('guestOrder.notice.completed.title'),
    })
  }
  if (status === 'declined') {
    const entry = order.log.find(e => e.type === 'declined')

    notices.push({
      status: 'danger',
      title: t('guestOrder.notice.declined.title'),
      body:
        entry?.type === 'declined'
          ? t('guestOrder.notice.declined.body', { reason: entry.reason })
          : undefined,
    })
  }
  if (status === 'cancelled') {
    notices.push(
      cancelReason === 'overdue'
        ? {
            status: 'danger',
            title: t('guestOrder.notice.overdue.title'),
            body: t('guestOrder.notice.overdue.body', {
              due: order.firstPaymentDueAt
                ? dateTime(order.firstPaymentDueAt)
                : '',
            }),
          }
        : cancelReason === 'guest'
          ? {
              status: 'default',
              title: t('guestOrder.notice.cancelledByYou.title'),
              body: t('guestOrder.notice.cancelledByYou.body'),
            }
          : {
              status: 'default',
              title: t('guestOrder.notice.cancelledByShop.title'),
            },
    )
    if (summary.isProcessing) {
      notices.push({
        status: 'default',
        title: t('guestOrder.notice.processingAfterCancel.title'),
        body: t('guestOrder.notice.processingAfterCancel.body'),
      })
    }
    if (latePayments.length) {
      notices.push({
        status: 'warning',
        title: t('guestOrder.notice.lateResult.title', {
          amount: money(latePayments.reduce((sum, p) => sum + p.amount, 0)),
        }),
        body: t('guestOrder.notice.lateResult.body'),
      })
    }
  }

  // --- actions --------------------------------------------------------------
  const due = amountDueNow(order)

  const requestAgain = () => {
    for (const line of order.lines) {
      if (!products.some(p => p.id === line.productId))
        continue
      cart.add({
        productId: line.productId,
        variantId: line.variantId,
        quantity: line.quantity,
        engraving: line.engraving,
        pickupDate: order.pickupDate,
        pickupPlaceId: order.pickupPlaceId,
      })
    }
    void navigate({ to: '/cart' })
  }

  // --- payment history ------------------------------------------------------
  const methodKey: Record<Payment['method'], MessageKey> = {
    'online': 'guestOrder.method.online',
    'cash': 'guestOrder.method.cash',
    'bank-transfer': 'guestOrder.method.bankTransfer',
    'other': 'guestOrder.method.other',
  }
  const paymentStatus = (p: Payment): ShownLabel =>
    latePayments.includes(p)
      ? { text: t('guestOrder.paymentStatus.late'), tone: 'warning' }
      : p.status === 'succeeded'
        ? { text: t('guestOrder.paymentStatus.succeeded'), tone: 'success' }
        : p.status === 'processing'
          ? { text: t('guestOrder.paymentStatus.processing'), tone: 'info' }
          : { text: t('guestOrder.paymentStatus.failed'), tone: 'danger' }

  // --- timeline -------------------------------------------------------------
  const eventText = (e: LogEntry): string | null => {
    switch (e.type) {
      case 'requested':
        return t('guestOrder.timeline.requested')
      case 'pickup-changed':
        return e.field === 'place'
          ? t('guestOrder.timeline.placeChanged', {
              place: placeName(places, e.to, language),
            })
          : t('guestOrder.timeline.dateChanged', { date: date(e.to) })
      case 'accepted':
        return t(
          order.paymentPolicy.kind === 'later'
            ? 'guestOrder.timeline.acceptedPayLater'
            : 'guestOrder.timeline.accepted',
        )
      case 'declined':
        return t('guestOrder.timeline.declined')
      case 'payment': {
        const p = payment(e.paymentId)

        if (!p)
          return null

        return p.method === 'online'
          ? t('guestOrder.timeline.paymentStarted', {
              amount: money(p.amount),
            })
          : t('guestOrder.timeline.paymentRecorded', {
              amount: money(p.amount),
              method: t(methodKey[p.method]),
            })
      }
      case 'payment-result': {
        const p = payment(e.paymentId)

        if (!p)
          return null

        return t(
          e.status === 'succeeded'
            ? 'guestOrder.timeline.paymentSucceeded'
            : 'guestOrder.timeline.paymentFailed',
          { amount: money(p.amount) },
        )
      }
      case 'ready':
        return t('guestOrder.timeline.ready')
      case 'handed-over':
        return t('guestOrder.timeline.handedOver')
      case 'completed':
        return t('guestOrder.timeline.completed')
      case 'cancelled':
        return t(
          e.reason === 'overdue'
            ? 'guestOrder.timeline.cancelledOverdue'
            : e.reason === 'guest'
              ? 'guestOrder.timeline.cancelledByYou'
              : 'guestOrder.timeline.cancelledByShop',
        )
    }
  }

  const timeline: TimelineStep[] = [
    ...order.log.flatMap((e) => {
      const text = eventText(e)

      return text ? [{ text, time: dateTime(e.at) }] : []
    }),
    ...(closed ? [] : upcomingKeys(order).map(key => ({ text: t(key) }))),
  ]

  // --- policy at the time of ordering (AC15) --------------------------------
  const policy = order.paymentPolicy
  const total = orderTotal(order)
  const firstPayment = firstPaymentAmount(order)
  const paymentPolicy
    = policy.kind === 'full'
      ? `${t('guestOrder.policy.full', { amount: money(total), hours: policy.firstDueHours })} ${t('detail.payment.autoCancel')}`
      : policy.kind === 'deposit'
        ? `${t('guestOrder.policy.deposit', {
          percent: policy.depositPercent,
          deposit: money(firstPayment),
          hours: policy.firstDueHours,
          balance: money(total - firstPayment),
          days: policy.balanceDueDaysAfterPickup,
        })} ${t('detail.payment.autoCancel')}`
        : t('guestOrder.policy.later', {
            amount: money(total),
            days: policy.dueDaysAfterPickup,
          })
  const cancellation = pickText(order.cancellationPolicy, language)

  const subject = encodeURIComponent(
    t('guestOrder.contact.subject', { ref: order.ref }),
  )

  return {
    id: order.id,
    ref: order.ref,
    title:
      rest.length > 0
        ? t('transactions.row.more', { name: firstName, count: rest.length })
        : firstName,
    photo: products.find(p => p.id === first.productId)?.photo,
    progress: summary.progress,
    payment: summary.payment,
    closed,
    pickupDay: pickupDay(order.pickupDate, intlLocale),
    notices,
    actions: {
      pay: !startOnlinePaymentBlock(order)
        ? {
            label: t('guestOrder.action.pay', { amount: money(due) }),
            orderId: order.id,
          }
        : undefined,
      cancel: canCancel
        ? { onConfirm: () => actions.cancelByGuest(order.id) }
        : undefined,
      requestAgain:
        status === 'cancelled' ? { onPress: requestAgain } : undefined,
      review: status === 'completed' ? order : undefined,
    },
    pickup: {
      title: t(
        status === 'requested' || status === 'declined'
          ? 'guestOrder.pickup.requested'
          : status === 'cancelled'
            ? 'guestOrder.pickup.cancelled'
            : 'guestOrder.pickup.confirmed',
      ),
      date: date(order.pickupDate),
      place: placeName(places, order.pickupPlaceId, language),
      address: place?.address ?? '',
      hours: place ? pick(place.openingHours) : '',
      instructions: place ? pick(place.instructions) : '',
    },
    items: order.lines.map(line => ({
      id: line.id,
      name: pick(line.productName),
      detail: [
        pick(line.variantLabel),
        t('guestOrder.items.quantity', {
          quantity: line.quantity,
          price: money(line.unitPrice),
        }),
        line.engraving
          ? t('guestOrder.items.engraving', { text: line.engraving })
          : null,
      ]
        .filter(Boolean)
        .join(' · '),
      photo: products.find(p => p.id === line.productId)?.photo,
      total: money(lineTotal(line)),
    })),
    amounts: [
      { label: t('guestOrder.amounts.total'), value: money(summary.total) },
      { label: t('guestOrder.amounts.paid'), value: money(summary.paid) },
      ...(closed
        ? []
        : [
            {
              label: t('guestOrder.amounts.balance'),
              value: money(summary.balance),
              strong: true,
            },
          ]),
    ],
    payments: order.payments.map(p => ({
      id: p.id,
      amount: money(p.amount),
      meta: `${t(methodKey[p.method])} · ${dateTime(p.at)}`,
      status: paymentStatus(p),
    })),
    timeline,
    policy: {
      payment: paymentPolicy,
      cancellation: cancellation.text,
      cancellationNotice: cancellation.isFallback
        ? t(
            cancellation.language === 'en'
              ? 'gifts.textInEnglish'
              : 'gifts.textInGerman',
          )
        : undefined,
    },
    contact: {
      emailHref: `mailto:${shop.email}?subject=${subject}`,
      callHref: `tel:${shop.phone.replace(WHITESPACE, '')}`,
    },
  }
}
