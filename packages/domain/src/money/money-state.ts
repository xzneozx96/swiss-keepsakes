import type { Rappen } from '../catalog/types'

import { zurichDate } from '../catalog/pickup'

/** One ledger row (UX spec §2.3). Only `succeeded` rows count; `processing` never adds to the paid amount. */
export interface LedgerEntry {
  kind: 'collection' | 'refund'
  status: 'processing' | 'succeeded' | 'failed'
  amount: Rappen
  at: string
}

/** Where the transaction stands before money is looked at. */
export type MoneyStage = 'requested' | 'open' | 'closed'

export interface MoneyInput {
  entries: readonly LedgerEntry[]
  total: Rappen
  /** `requested`: nothing is due yet. `closed`: declined or cancelled, so nothing is owed. */
  stage: MoneyStage
  /** What is payable now: the rest of the first payment, or the balance once it is paid. */
  dueNow: Rappen
  /** True while the first payment is still awaited (accepted order). */
  awaitingFirstPayment: boolean
  firstPaymentDueAt?: string | null
  /** Calendar day (YYYY-MM-DD) the rest is due. */
  balanceDueDate?: string | null
  depositPolicy: boolean
  /** When the transaction was cancelled; money confirmed later is flagged for reconciliation. */
  closedAt?: string | null
}

/** Reason code of the payment label (UX spec §2.3). The front-end maps it to copy. */
export type PaymentCode
  = | 'not-due'
    | 'processing'
    | 'after-cancellation'
    | 'paid'
    | 'none'
    | 'paid-in-full'
    | 'overdue'
    | 'due'
    | 'pay-later'
    | 'owed'
    | 'part-paid'
    | 'deposit-paid'
    | 'part-paid-due'

export type RefundCode
  = 'none' | 'processing' | 'failed' | 'partial' | 'full'

export interface MoneyState {
  /** Succeeded collections. Can exceed the total after a duplicate. */
  paid: Rappen
  /** What is still owed. Never negative, and zero for a closed transaction. */
  balance: Rappen
  /** Paid above the total, for reconciliation. */
  overpaid: Rappen
  /** Succeeded refunds. They never bring the balance back. */
  refunded: Rappen
  refundPending: Rappen
  refundFailed: Rappen
  dueNow: Rappen
  overdue: boolean
  payment: PaymentCode
  refund: RefundCode
}

const sum = (entries: readonly LedgerEntry[], kind: LedgerEntry['kind'], status: LedgerEntry['status']) =>
  entries
    .filter(e => e.kind === kind && e.status === status)
    .reduce((total, e) => total + e.amount, 0)

function isOverdue(input: MoneyInput, now: Date): boolean {
  if (input.dueNow === 0)
    return false
  if (input.awaitingFirstPayment) {
    return !!input.firstPaymentDueAt
      && Date.parse(input.firstPaymentDueAt) < now.getTime()
  }

  return !!input.balanceDueDate && zurichDate(now) > input.balanceDueDate
}

function refundCode(entries: readonly LedgerEntry[], paid: Rappen, refunded: Rappen): RefundCode {
  if (entries.some(e => e.kind === 'refund' && e.status === 'processing'))
    return 'processing'
  if (refunded > 0)
    return refunded >= paid ? 'full' : 'partial'

  return entries.some(e => e.kind === 'refund' && e.status === 'failed')
    ? 'failed'
    : 'none'
}

function paymentCode(
  input: MoneyInput,
  paid: Rappen,
  balance: Rappen,
  overdue: boolean,
): PaymentCode {
  const { entries, stage } = input
  const processing = entries.some(
    e => e.kind === 'collection' && e.status === 'processing',
  )

  if (stage === 'requested')
    return 'not-due'
  if (stage === 'closed') {
    const closedAt = input.closedAt

    if (processing)
      return 'processing'
    if (
      closedAt
      && entries.some(
        e =>
          e.kind === 'collection'
          && e.status === 'succeeded'
          && Date.parse(e.at) > Date.parse(closedAt),
      )
    ) {
      return 'after-cancellation'
    }

    return paid > 0 ? 'paid' : 'none'
  }
  if (processing)
    return 'processing'
  if (balance === 0)
    return 'paid-in-full'
  if (overdue)
    return 'overdue'
  if (input.awaitingFirstPayment && input.firstPaymentDueAt)
    return 'due'
  if (paid === 0)
    return input.balanceDueDate ? 'pay-later' : 'owed'
  if (!input.balanceDueDate)
    return 'part-paid'

  return input.depositPolicy ? 'deposit-paid' : 'part-paid-due'
}

/**
 * The paid amount, the balance and the two payment labels from the ledger (UX spec §2.3,
 * backend §7.1). Pure: `now` comes in as an argument. A duplicate collection raises `paid` and
 * `overpaid` but never makes the balance negative.
 */
export function moneyState(input: MoneyInput, now: Date): MoneyState {
  const paid = sum(input.entries, 'collection', 'succeeded')
  const refunded = sum(input.entries, 'refund', 'succeeded')
  const balance
    = input.stage === 'closed' ? 0 : Math.max(0, input.total - paid)
  const overdue = isOverdue(input, now)

  return {
    paid,
    balance,
    overpaid: Math.max(0, paid - input.total),
    refunded,
    refundPending: sum(input.entries, 'refund', 'processing'),
    refundFailed: sum(input.entries, 'refund', 'failed'),
    dueNow: input.dueNow,
    overdue,
    payment: paymentCode(input, paid, balance, overdue),
    refund: refundCode(input.entries, paid, refunded),
  }
}
