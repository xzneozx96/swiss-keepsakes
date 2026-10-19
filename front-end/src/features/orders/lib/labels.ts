import type { Rappen } from '@sk/domain/catalog'
import type { CommissionState, Order } from '@sk/domain/orders'
import type { IntlLocale } from '@sk/domain/shared'
import type { OrderBlock } from './transitions'
import type { StatusTone } from '@/components/status-chip'
import type { Language } from '@/contexts/locale-context'
import type { MessageKey } from '@/i18n/en'

import { moneyState } from '@sk/domain/money'
import { amountDueNow, formatOrderDate, formatOrderDateTime, orderTotal } from '@sk/domain/orders'

import { formatMoney, pickText } from '@sk/domain/shared'

/** A raw value in a label: money and dates are formatted for the reader's language. */
export type LabelValue
  = string | number | { money: Rappen } | { date: string } | { dateTime: string }

/** A label as data: the i18n key, its StatusChip tone and the values to fill in. */
export interface OrderLabel {
  key: MessageKey
  tone: StatusTone
  vars?: Record<string, LabelValue>
}

type Translate = (
  key: MessageKey,
  vars?: Record<string, string | number>,
) => string

export function formatLabel(
  label: OrderLabel,
  t: Translate,
  locale: IntlLocale,
): string {
  const vars = Object.fromEntries(
    Object.entries(label.vars ?? {}).map(([name, value]) => [
      name,
      typeof value !== 'object'
        ? value
        : 'money' in value
          ? formatMoney(value.money / 100, locale)
          : 'date' in value
            ? formatOrderDate(value.date, locale)
            : formatOrderDateTime(value.dateTime, locale),
    ]),
  )

  return t(label.key, vars)
}

/**
 * The progress label (spec §2.1). Guests read "Cancelled by you" where staff read
 * "Cancelled by guest".
 */
export function progressLabel(
  order: Order,
  audience: 'guest' | 'staff' = 'guest',
): OrderLabel {
  switch (order.status) {
    case 'requested':
      return { key: 'order.status.requested', tone: 'info' }
    case 'accepted':
      return { key: 'order.status.accepted', tone: 'warning' }
    case 'preparing':
      return { key: 'order.status.preparing', tone: 'info' }
    case 'ready':
      return { key: 'order.status.ready', tone: 'success' }
    case 'handed_over':
      return { key: 'order.status.handedOver', tone: 'info' }
    case 'completed':
      return { key: 'order.status.completed', tone: 'success' }
    case 'declined':
      return { key: 'order.status.declined', tone: 'danger' }
    case 'cancelled': {
      const entry = [...order.log]
        .reverse()
        .find(e => e.type === 'cancelled')
      const reason = entry?.type === 'cancelled' ? entry.reason : undefined

      if (reason === 'overdue')
        return { key: 'order.status.cancelled.overdue', tone: 'danger' }
      if (reason === 'merchant')
        return { key: 'order.status.cancelled.merchant', tone: 'neutral' }
      if (reason === 'guest') {
        return {
          key:
            audience === 'guest'
              ? 'order.status.cancelled.byYou'
              : 'order.status.cancelled.byGuest',
          tone: 'neutral',
        }
      }

      return { key: 'order.status.cancelled', tone: 'neutral' }
    }
  }
}

function moneyInput(order: Order) {
  return {
    entries: order.payments.map(p => ({
      kind: 'collection' as const,
      status: p.status,
      amount: p.amount,
      at: p.at,
    })),
    total: orderTotal(order),
    stage:
      order.status === 'requested'
        ? ('requested' as const)
        : order.status === 'declined' || order.status === 'cancelled'
          ? ('closed' as const)
          : ('open' as const),
    dueNow: amountDueNow(order),
    awaitingFirstPayment: order.status === 'accepted',
    firstPaymentDueAt: order.firstPaymentDueAt,
    balanceDueDate: order.balanceDueDate,
    depositPolicy: order.paymentPolicy.kind === 'deposit',
    closedAt:
      order.status === 'cancelled'
        ? [...order.log].reverse().find(e => e.type === 'cancelled')?.at
        : undefined,
  }
}

/** The payment label (spec §2.3), separate from progress. `now` is demo time. */
export function paymentLabel(order: Order, now: Date): OrderLabel {
  const state = moneyState(moneyInput(order), now)
  const money = (amount: Rappen) => ({ money: amount })
  const due = order.balanceDueDate ?? ''
  const parts = { paid: money(state.paid), balance: money(state.balance) }

  switch (state.payment) {
    case 'not-due':
      return { key: 'order.payment.notDue', tone: 'neutral' }
    case 'processing':
      return { key: 'order.payment.processing', tone: 'info' }
    case 'after-cancellation':
      return { key: 'order.payment.afterCancellation', tone: 'warning' }
    case 'paid':
      return {
        key: 'order.payment.paid',
        tone: 'neutral',
        vars: { amount: money(state.paid) },
      }
    // Only tour holds expire; an order never reaches these two.
    case 'session-closed':
    case 'after-expiry':
    case 'none':
      return { key: 'order.payment.none', tone: 'neutral' }
    case 'paid-in-full':
      return {
        key: 'order.payment.paidInFull',
        tone: 'success',
        vars: { amount: money(orderTotal(order)) },
      }
    case 'overdue':
      return {
        key: 'order.payment.overdue',
        tone: 'danger',
        vars: { amount: money(state.dueNow) },
      }
    case 'due':
      return {
        key: 'order.payment.due',
        tone: 'warning',
        vars: {
          amount: money(state.dueNow),
          due: { dateTime: order.firstPaymentDueAt ?? '' },
        },
      }
    case 'pay-later':
      return {
        key: 'order.payment.payLater',
        tone: 'neutral',
        vars: { amount: money(state.balance), due: { date: due } },
      }
    case 'owed':
      return {
        key: 'order.payment.owed',
        tone: 'neutral',
        vars: { amount: money(state.balance) },
      }
    case 'part-paid':
      return { key: 'order.payment.partPaid', tone: 'info', vars: parts }
    case 'deposit-paid':
      return {
        key: 'order.payment.depositPaid',
        tone: 'info',
        vars: { ...parts, due: { date: due } },
      }
    case 'part-paid-due':
      return {
        key: 'order.payment.partPaidDue',
        tone: 'info',
        vars: { ...parts, due: { date: due } },
      }
  }
}

const commissionKeys: Record<CommissionState, MessageKey> = {
  'none': 'order.commission.none',
  'estimated': 'order.commission.estimated',
  'recorded': 'order.commission.recorded',
  'not-applicable': 'order.commission.notApplicable',
}

export function commissionLabel(state: CommissionState): OrderLabel {
  return {
    key: commissionKeys[state],
    tone: state === 'recorded' ? 'success' : 'neutral',
  }
}

/** Why an action is blocked, worded for the screen (e.g. Complete locked: "CHF 62.30 still owed"). */
export function blockLabel(block: OrderBlock, language: Language): OrderLabel {
  switch (block.code) {
    case 'stock-short': {
      const line = block.lines[0]

      return {
        key: 'order.block.stockShort',
        tone: 'danger',
        vars: {
          item: `${pickText(line.productName, language).text} (${pickText(line.variantLabel, language).text})`,
          available: line.available,
          requested: line.requested,
        },
      }
    }
    case 'above-balance':
      return {
        key: 'order.block.aboveBalance',
        tone: 'danger',
        vars: { amount: { money: block.balance } },
      }
    case 'duplicate':
      return {
        key: 'order.block.duplicate',
        tone: 'warning',
        vars: {
          amount: { money: block.payment.amount },
          at: { dateTime: block.payment.at },
        },
      }
    case 'balance-owed':
      return {
        key: 'order.block.balanceOwed',
        tone: 'warning',
        vars: { amount: { money: block.balance } },
      }
    case 'not-handed-over':
      return { key: 'order.block.notHandedOver', tone: 'neutral' }
    case 'note-required':
      return { key: 'order.block.noteRequired', tone: 'danger' }
    case 'reason-required':
      return { key: 'order.block.reasonRequired', tone: 'danger' }
    case 'payment-processing':
      return { key: 'order.block.paymentProcessing', tone: 'info' }
    case 'nothing-due':
      return { key: 'order.block.nothingDue', tone: 'neutral' }
    case 'invalid-amount':
      return { key: 'order.block.invalidAmount', tone: 'danger' }
    case 'already-paid':
      return { key: 'order.block.alreadyPaid', tone: 'neutral' }
    case 'wrong-status':
      return { key: 'order.block.wrongStatus', tone: 'neutral' }
  }
}
