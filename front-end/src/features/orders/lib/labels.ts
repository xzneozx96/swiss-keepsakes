import type { Order } from '../types'
import type { CommissionState } from './selectors'
import type { OrderBlock } from './transitions'
import type { StatusTone } from '@/components/status-chip'
import type { Language } from '@/contexts/locale-context'
import type { Rappen } from '@/features/catalog/types'
import type { MessageKey } from '@/i18n/en'
import type { IntlLocale } from '@/lib/format'

import { formatMoney } from '@/lib/format'
import { pickText } from '@/lib/localized'

import { formatOrderDate, formatOrderDateTime } from './format'
import {
  amountDueNow,
  amountPaid,
  balance,
  isOverdue,
  orderTotal,
  paymentsAfterCancellation,
  processingPayment,
} from './selectors'

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

/** The payment label (spec §2.3), separate from progress. `now` is demo time. */
export function paymentLabel(order: Order, now: Date): OrderLabel {
  const paid = amountPaid(order)
  const owed = balance(order)
  const money = (amount: Rappen) => ({ money: amount })

  if (order.status === 'requested')
    return { key: 'order.payment.notDue', tone: 'neutral' }

  if (order.status === 'declined' || order.status === 'cancelled') {
    if (processingPayment(order))
      return { key: 'order.payment.processing', tone: 'info' }
    if (paymentsAfterCancellation(order).length)
      return { key: 'order.payment.afterCancellation', tone: 'warning' }

    return paid > 0
      ? {
          key: 'order.payment.paid',
          tone: 'neutral',
          vars: { amount: money(paid) },
        }
      : { key: 'order.payment.none', tone: 'neutral' }
  }

  if (processingPayment(order))
    return { key: 'order.payment.processing', tone: 'info' }
  if (owed === 0) {
    return {
      key: 'order.payment.paidInFull',
      tone: 'success',
      vars: { amount: money(orderTotal(order)) },
    }
  }
  if (isOverdue(order, now)) {
    return {
      key: 'order.payment.overdue',
      tone: 'danger',
      vars: { amount: money(amountDueNow(order)) },
    }
  }
  if (order.status === 'accepted' && order.firstPaymentDueAt) {
    return {
      key: 'order.payment.due',
      tone: 'warning',
      vars: {
        amount: money(amountDueNow(order)),
        due: { dateTime: order.firstPaymentDueAt },
      },
    }
  }

  const due = order.balanceDueDate

  if (paid === 0) {
    return due
      ? {
          key: 'order.payment.payLater',
          tone: 'neutral',
          vars: { amount: money(owed), due: { date: due } },
        }
      : {
          key: 'order.payment.owed',
          tone: 'neutral',
          vars: { amount: money(owed) },
        }
  }

  const parts = { paid: money(paid), balance: money(owed) }

  if (!due)
    return { key: 'order.payment.partPaid', tone: 'info', vars: parts }

  return {
    key:
      order.paymentPolicy.kind === 'deposit'
        ? 'order.payment.depositPaid'
        : 'order.payment.partPaidDue',
    tone: 'info',
    vars: { ...parts, due: { date: due } },
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
