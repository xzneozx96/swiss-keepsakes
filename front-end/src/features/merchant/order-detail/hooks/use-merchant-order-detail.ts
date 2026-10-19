import type { Language } from '@/contexts/locale-context'
import type { PickupPlace } from '@/features/catalog/types'
import type { ShownLabel } from '@/features/orders/hooks/use-orders'
import type { PickupChange } from '@/features/orders/lib/transitions'
import type { Actor, LogEntry, Order, Payment } from '@/features/orders/types'
import type { MessageKey } from '@/i18n/en'

import { useLocale } from '@/contexts/locale-context'
import { shop } from '@/features/catalog/seed'
import { useDemo } from '@/features/demo'
import { demoNow } from '@/features/demo/clock'
import {
  useBlockText,
  useOrderActions,
  useOrderSummary,
} from '@/features/orders/hooks/use-orders'
import {
  formatOrderDate,
  formatOrderDateTime,
} from '@/features/orders/lib/format'
import {
  dueDatesAtAcceptance,
  firstPaymentAmount,
  lineTotal,
  orderTotal,
  shortLines,
  variantAvailable,
} from '@/features/orders/lib/selectors'
import {
  acceptBlock,
  changePickupBlock,
  declineBlock,
} from '@/features/orders/lib/transitions'
import { de } from '@/i18n/de'
import { en } from '@/i18n/en'
import { formatMoney, numberFormat } from '@/lib/format'
import { pickText } from '@/lib/localized'

export type DeclineReason = 'outOfStock' | 'date' | 'other'

export const declineReasons: DeclineReason[] = ['outOfStock', 'date', 'other']

const declineReasonKeys: Record<DeclineReason, MessageKey> = {
  outOfStock: 'merchantOrder.decline.reason.outOfStock',
  date: 'merchantOrder.decline.reason.date',
  other: 'merchantOrder.decline.reason.other',
}

/** Dictionaries by language: the decline reason is written in the guest's language (N06). */
const messages: Record<Language, Record<MessageKey, string>> = { en, de }

export interface StockRow {
  id: string
  name: string
  available: number
  needed: number
  isShort: boolean
}

export interface AcceptConfirmation {
  sentence: string
  confirmLabel: string
  /** Summary card in the sheet: what the guest is asked for, and by when. */
  amount: string
  /** "now": requested on accept; "later": paid after pickup. */
  amountKind: 'now' | 'later'
  due: string
  units: string
}

export interface LogRow {
  id: string
  type: LogEntry['type']
  /** Ring colour on the timeline: green only for the order's own end, brick for failures. */
  tone: 'neutral' | 'success' | 'danger'
  text: string
  /** Note (pickup changes), who and when: "note · Lukas · 13.10.2026, 10:25". */
  meta: string
  note?: string
  who: string
  at: string
}

export interface MerchantOrderView {
  ref: string
  progress: ShownLabel
  payment: ShownLabel
  requestedAt: string
  isRequested: boolean
  pickup: { date: string, place: string, address: string, hours: string }
  /** Per line, summed per variant, for the accept decision (O05). */
  stock: StockRow[]
  items: {
    id: string
    name: string
    variant: string
    quantity: string
    engraving?: string
    total: string
    photo?: string
  }[]
  amounts: { label: string, value: string, strong?: boolean }[]
  totals: { total: string, paid: string, balance: string }
  guest: { name: string, email: string, emailHref: string }
  source: { name: string, isPartner: boolean }
  payments: {
    id: string
    amount: string
    meta: string
    status: ShownLabel
  }[]
  commission: {
    label: ShownLabel
    lines: { id: string, name: string, detail: string, amount: string }[]
    total?: string
  }
  log: LogRow[]
  policy: { payment: string, cancellation: string, fallbackNotice?: string }
}

export interface MerchantOrderActions {
  /** Computed when the accept sheet opens, from the demo time at that moment. */
  acceptConfirmation: () => AcceptConfirmation
  /** Why accepting is blocked right now (e.g. the short line), before the sheet opens. */
  acceptCheck: () => ShownLabel | null
  /** Null when accepted; otherwise the reason (e.g. the short line), and the order stays requested. */
  accept: () => ShownLabel | null
  /** Null when saved; otherwise the error to show in the sheet. */
  changePickup: (input: {
    date: string
    placeId: string
    note: string
  }) => string | null
  /** Checks the input before the confirm dialog; null when it may be sent. */
  declineError: (reason: DeclineReason, note: string) => string | null
  decline: (reason: DeclineReason, note: string) => void
}

function placeName(places: PickupPlace[], id: string, language: Language) {
  const place = places.find(p => p.id === id)

  return place ? pickText(place.name, language).text : id
}

/** M04 Gift order detail for Owner and Manager (spec §4.6, §5.2). */
export function useMerchantOrderDetail(order: Order): {
  view: MerchantOrderView
  actions: MerchantOrderActions
} {
  const { t, language, intlLocale } = useLocale()
  const { state } = useDemo()
  const orderActions = useOrderActions()
  const blockText = useBlockText()
  const summary = useOrderSummary(order, 'staff')
  const money = (rappen: number) => formatMoney(rappen / 100, intlLocale)
  const date = (iso: string) => formatOrderDate(iso, intlLocale)
  const dateTime = (iso: string) => formatOrderDateTime(iso, intlLocale)
  const pick = (text: Partial<Record<Language, string>>) =>
    pickText(text, language).text
  const percent = (rate: number) =>
    numberFormat(intlLocale, {
      style: 'percent',
      maximumFractionDigits: 1,
    }).format(rate)
  const guest = state.data.guests.find(g => g.id === order.guestId)
  const guestName = guest?.name ?? order.guestId
  const places = state.data.pickupPlaces
  const place = places.find(p => p.id === order.pickupPlaceId)
  const partner = state.data.partners.find(p => p.id === order.partnerId)
  const lineName = (l: Order['lines'][number]) =>
    `${pick(l.productName)} (${pick(l.variantLabel)})`

  const actorName = (actor: Actor): string => {
    switch (actor) {
      case 'owner':
        return shop.ownerName
      case 'manager':
        return 'Lukas'
      case 'guest':
        return guestName
      case 'system':
        return t('merchantOrder.actor.system')
    }
  }

  const methodKey: Record<Payment['method'], MessageKey> = {
    'online': 'merchantOrder.method.online',
    'cash': 'merchantOrder.method.cash',
    'bank-transfer': 'merchantOrder.method.bankTransfer',
    'other': 'merchantOrder.method.other',
  }

  // --- stock per line (O05: held only on accept) ------------------------------
  const short = shortLines(state.data, order)
  const stock: StockRow[] = order.lines.map((l) => {
    const needed = order.lines
      .filter(o => o.productId === l.productId && o.variantId === l.variantId)
      .reduce((sum, o) => sum + o.quantity, 0)

    return {
      id: l.id,
      name: lineName(l),
      available: variantAvailable(state.data, l.productId, l.variantId),
      needed,
      isShort: short.some(
        s => s.productId === l.productId && s.variantId === l.variantId,
      ),
    }
  })

  // --- log ---------------------------------------------------------------------
  const payment = (id: string) => order.payments.find(p => p.id === id)
  const eventText = (e: LogEntry): string => {
    switch (e.type) {
      case 'requested':
        return t('merchantOrder.log.requested')
      case 'pickup-changed':
        return e.field === 'place'
          ? t('merchantOrder.log.placeChanged', {
              from: placeName(places, e.from, language),
              to: placeName(places, e.to, language),
            })
          : t('merchantOrder.log.dateChanged', {
              from: date(e.from),
              to: date(e.to),
            })
      case 'accepted':
        return t(
          order.paymentPolicy.kind === 'later'
            ? 'merchantOrder.log.acceptedPayLater'
            : 'merchantOrder.log.accepted',
        )
      case 'declined':
        return t('merchantOrder.log.declined', { reason: e.reason })
      case 'payment': {
        const p = payment(e.paymentId)
        const amount = p ? money(p.amount) : ''

        return p?.method === 'online'
          ? t('merchantOrder.log.paymentStarted', { amount })
          : t('merchantOrder.log.paymentRecorded', {
              amount,
              method: p ? t(methodKey[p.method]) : '',
            })
      }
      case 'payment-result': {
        const p = payment(e.paymentId)

        return t(
          e.status === 'succeeded'
            ? 'merchantOrder.log.paymentSucceeded'
            : 'merchantOrder.log.paymentFailed',
          { amount: p ? money(p.amount) : '' },
        )
      }
      case 'ready':
        return t('merchantOrder.log.ready')
      case 'handed-over':
        return t('merchantOrder.log.handedOver')
      case 'completed':
        return t('merchantOrder.log.completed')
      case 'cancelled':
        return t(
          e.reason === 'overdue'
            ? 'merchantOrder.log.cancelledOverdue'
            : e.reason === 'guest'
              ? 'merchantOrder.log.cancelledByGuest'
              : 'merchantOrder.log.cancelledByShop',
        )
    }
  }
  const eventTone = (e: LogEntry): LogRow['tone'] => {
    switch (e.type) {
      case 'completed':
        return 'success'
      case 'declined':
      case 'cancelled':
        return 'danger'
      case 'payment-result':
        return e.status === 'succeeded' ? 'neutral' : 'danger'
      default:
        return 'neutral'
    }
  }
  const log: LogRow[] = order.log.map((e, i) => ({
    id: `${i}-${e.type}`,
    type: e.type,
    tone: eventTone(e),
    text: eventText(e),
    note: e.type === 'pickup-changed' ? e.note : undefined,
    who: actorName(e.actor),
    at: dateTime(e.at),
    meta: [
      e.type === 'pickup-changed' ? e.note : null,
      actorName(e.actor),
      dateTime(e.at),
    ]
      .filter(Boolean)
      .join(' · '),
  }))

  // --- payments ----------------------------------------------------------------
  const paymentStatus = (p: Payment): ShownLabel =>
    p.status === 'succeeded'
      ? { text: t('merchantOrder.paymentStatus.succeeded'), tone: 'success' }
      : p.status === 'processing'
        ? { text: t('merchantOrder.paymentStatus.processing'), tone: 'info' }
        : { text: t('merchantOrder.paymentStatus.failed'), tone: 'danger' }

  // --- policy at the time of ordering (AC15) -----------------------------------
  const policy = order.paymentPolicy
  const total = orderTotal(order)
  const first = firstPaymentAmount(order)
  const paymentPolicy
    = policy.kind === 'full'
      ? t('merchantOrder.policy.full', {
          amount: money(total),
          hours: policy.firstDueHours,
        })
      : policy.kind === 'deposit'
        ? t('merchantOrder.policy.deposit', {
            percent: percent(policy.depositPercent / 100),
            deposit: money(first),
            hours: policy.firstDueHours,
            balance: money(total - first),
            days: policy.balanceDueDaysAfterPickup,
          })
        : t('merchantOrder.policy.later', {
            amount: money(total),
            days: policy.dueDaysAfterPickup,
          })
  const cancellation = pickText(order.cancellationPolicy, language)
  const fees = summary.commission
  const subject = encodeURIComponent(
    t('merchantOrder.guest.subject', { ref: order.ref }),
  )

  const view: MerchantOrderView = {
    ref: order.ref,
    progress: summary.progress,
    payment: summary.payment,
    requestedAt: dateTime(order.createdAt),
    isRequested: order.status === 'requested',
    pickup: {
      date: date(order.pickupDate),
      place: placeName(places, order.pickupPlaceId, language),
      address: place?.address ?? '',
      hours: place ? pick(place.openingHours) : '',
    },
    stock,
    items: order.lines.map(l => ({
      id: l.id,
      name: pick(l.productName),
      variant: pick(l.variantLabel),
      quantity: t('merchantOrder.items.quantity', {
        quantity: l.quantity,
        price: money(l.unitPrice),
      }),
      engraving: l.engraving,
      total: money(lineTotal(l)),
      photo: state.data.products.find(p => p.id === l.productId)?.photo,
    })),
    amounts: [
      { label: t('merchantOrder.amounts.total'), value: money(summary.total) },
      { label: t('merchantOrder.amounts.paid'), value: money(summary.paid) },
      {
        label: t('merchantOrder.amounts.balance'),
        value: money(summary.balance),
        strong: true,
      },
    ],
    totals: {
      total: money(summary.total),
      paid: money(summary.paid),
      balance: money(summary.balance),
    },
    guest: {
      name: guestName,
      email: guest?.email ?? '',
      emailHref: `mailto:${guest?.email ?? ''}?subject=${subject}`,
    },
    source: partner
      ? { name: partner.name, isPartner: true }
      : { name: t('merchantOrder.source.direct'), isPartner: false },
    payments: order.payments.map(p => ({
      id: p.id,
      amount: money(p.amount),
      meta: [
        t(methodKey[p.method]),
        p.recordedBy ? actorName(p.recordedBy) : null,
        dateTime(p.at),
        p.note ?? null,
      ]
        .filter(Boolean)
        .join(' · '),
      status: paymentStatus(p),
    })),
    commission: {
      label: fees.label,
      lines:
        fees.state === 'none'
          ? []
          : fees.lines.map((c) => {
              const l = order.lines.find(x => x.id === c.lineId)

              return {
                id: c.lineId,
                name: l ? pick(l.productName) : c.lineId,
                detail: t('merchantOrder.commission.basis', {
                  basis: money(c.basis),
                  rate: percent(c.rate),
                }),
                amount: money(c.amount),
              }
            }),
      total: fees.state === 'none' ? undefined : money(fees.total),
    },
    log,
    policy: {
      payment: paymentPolicy,
      cancellation: cancellation.text,
      fallbackNotice: cancellation.isFallback
        ? t(
            cancellation.language === 'en'
              ? 'gifts.textInEnglish'
              : 'gifts.textInGerman',
          )
        : undefined,
    },
  }

  // --- actions -------------------------------------------------------------------
  const acceptConfirmation = (): AcceptConfirmation => {
    const units = order.lines.reduce((sum, l) => sum + l.quantity, 0)
    const items = t(
      units === 1 ? 'merchantOrder.accept.item' : 'merchantOrder.accept.items',
      { count: units },
    )
    const due = dueDatesAtAcceptance(order, demoNow(state.clockStartedAt))
    const prepare = t('merchantOrder.accept.prepare', {
      items,
      date: date(order.pickupDate),
      place: placeName(places, order.pickupPlaceId, language),
    })

    if (policy.kind === 'later') {
      const dueText = due.balanceDueDate ? date(due.balanceDueDate) : ''

      return {
        sentence: `${prepare} ${t('merchantOrder.accept.payLater', {
          amount: money(total),
          due: dueText,
        })}`,
        confirmLabel: t('merchantOrder.accept.confirmPayLater'),
        amount: money(total),
        amountKind: 'later',
        due: dueText,
        units: items,
      }
    }

    const dueText = due.firstPaymentDueAt
      ? dateTime(due.firstPaymentDueAt)
      : ''

    return {
      sentence: `${prepare} ${t('merchantOrder.accept.pay', {
        amount: money(first),
        hours: policy.firstDueHours,
        due: dueText,
      })}`,
      confirmLabel: t('merchantOrder.accept.confirm', { amount: money(first) }),
      amount: money(first),
      amountKind: 'now',
      due: dueText,
      units: items,
    }
  }

  const acceptCheck = () => {
    const block = acceptBlock(state, order)

    return block ? blockText(block) : null
  }

  const accept = () => {
    const block = orderActions.accept(order.id)

    return block ? blockText(block) : null
  }

  const changePickup: MerchantOrderActions['changePickup'] = ({
    date: to,
    placeId,
    note,
  }) => {
    const changes: PickupChange[] = []

    if (to !== order.pickupDate)
      changes.push({ field: 'date', to, note })
    if (placeId !== order.pickupPlaceId)
      changes.push({ field: 'place', to: placeId, note })
    if (changes.length === 0)
      return t('merchantOrder.change.nothing')

    const block = changePickupBlock(order, changes[0])

    if (block)
      return blockText(block).text

    // One log entry per changed field; each transition re-checks on the latest state.
    for (const change of changes) orderActions.changePickup(order.id, change)

    return null
  }

  // The reason goes to the guest in N06, so it is written in the order's language.
  const reasonText = (reason: DeclineReason, note: string) =>
    reason === 'other'
      ? note.trim()
      : [messages[order.language][declineReasonKeys[reason]], note.trim()]
          .filter(Boolean)
          .join('. ')

  const declineError: MerchantOrderActions['declineError'] = (reason, note) => {
    if (reason === 'other' && !note.trim())
      return t('merchantOrder.decline.noteRequired')

    const block = declineBlock(order, reasonText(reason, note))

    return block ? blockText(block).text : null
  }

  const decline: MerchantOrderActions['decline'] = (reason, note) => {
    orderActions.decline(order.id, reasonText(reason, note))
  }

  return {
    view,
    actions: {
      acceptConfirmation,
      acceptCheck,
      accept,
      changePickup,
      declineError,
      decline,
    },
  }
}
