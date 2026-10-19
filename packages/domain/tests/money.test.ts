import { describe, expect, it } from 'vitest'

import type { LedgerEntry, MoneyInput } from '../src/money'
import { moneyState } from '../src/money'

const NOW = new Date('2026-10-19T10:00:00Z')
const col = (amount: number, status: LedgerEntry['status'] = 'succeeded', at = '2026-10-18T10:00:00Z'): LedgerEntry => ({ kind: 'collection', status, amount, at })
const ref = (amount: number, status: LedgerEntry['status'] = 'succeeded'): LedgerEntry => ({ kind: 'refund', status, amount, at: '2026-10-19T09:00:00Z' })
const input = (over: Partial<MoneyInput> = {}): MoneyInput => ({
  entries: [],
  total: 8900,
  stage: 'open',
  dueNow: 8900,
  awaitingFirstPayment: false,
  depositPolicy: false,
  ...over,
})

describe('[E1.4] moneyState: the UX spec 2.3 figures', () => {
  it('requested: not due', () => {
    expect(moneyState(input({ stage: 'requested', dueNow: 0 }), NOW).payment).toBe('not-due')
  })

  it('due: CHF 54.00 before 14.10.2026 (first payment awaited)', () => {
    const s = moneyState(input({ awaitingFirstPayment: true, dueNow: 5400, firstPaymentDueAt: '2026-10-20T10:00:00Z' }), NOW)

    expect(s).toMatchObject({ payment: 'due', dueNow: 5400, paid: 0, balance: 8900, overdue: false })
  })

  it('deposit paid: CHF 26.70 paid, CHF 62.30 left, due 20.10.2026', () => {
    const s = moneyState(input({ entries: [col(2670)], dueNow: 6230, depositPolicy: true, balanceDueDate: '2026-10-20' }), NOW)

    expect(s).toMatchObject({ payment: 'deposit-paid', paid: 2670, balance: 6230, overdue: false })
  })

  it('pay later: CHF 89.00 due on a later day', () => {
    const s = moneyState(input({ balanceDueDate: '2026-10-19' }), NOW)

    expect(s).toMatchObject({ payment: 'pay-later', balance: 8900, overdue: false })
  })

  it('overdue: CHF 62.30 once the due day is over', () => {
    const s = moneyState(input({ entries: [col(2670)], dueNow: 6230, depositPolicy: true, balanceDueDate: '2026-10-18' }), NOW)

    expect(s).toMatchObject({ payment: 'overdue', balance: 6230, dueNow: 6230, overdue: true })
  })

  it('paid in full: balance zero, CHF 89.00', () => {
    const s = moneyState(input({ entries: [col(8900)], dueNow: 0 }), NOW)

    expect(s).toMatchObject({ payment: 'paid-in-full', paid: 8900, balance: 0 })
  })

  it('refund processing: CHF 54.00 is not yet deducted', () => {
    const s = moneyState(input({ total: 5400, entries: [col(5400), ref(5400, 'processing')], dueNow: 0 }), NOW)

    expect(s).toMatchObject({ refund: 'processing', refundPending: 5400, refunded: 0, paid: 5400 })
  })

  it('refund failed: CHF 54.00 is not recorded as refunded', () => {
    const s = moneyState(input({ total: 5400, entries: [col(5400), ref(5400, 'failed')], dueNow: 0 }), NOW)

    expect(s).toMatchObject({ refund: 'failed', refundFailed: 5400, refunded: 0 })
  })

  it('partly refunded: CHF 20.00, and the balance does not come back', () => {
    const s = moneyState(input({ total: 5400, entries: [col(5400), ref(2000)], dueNow: 0 }), NOW)

    expect(s).toMatchObject({ refund: 'partial', refunded: 2000, balance: 0 })
  })

  it('fully refunded: CHF 54.00', () => {
    const s = moneyState(input({ total: 5400, entries: [col(5400), ref(5400)], dueNow: 0 }), NOW)

    expect(s).toMatchObject({ refund: 'full', refunded: 5400, balance: 0 })
  })

  it('a processing online payment never counts as paid', () => {
    const s = moneyState(input({ entries: [col(8900, 'processing')] }), NOW)

    expect(s).toMatchObject({ payment: 'processing', paid: 0, balance: 8900 })
  })

  it('a closed transaction owes nothing and flags money confirmed after the cancel', () => {
    const closed = input({ stage: 'closed', closedAt: '2026-10-18T12:00:00Z', dueNow: 0 })

    expect(moneyState({ ...closed, entries: [col(2670, 'succeeded', '2026-10-18T13:00:00Z')] }, NOW)).toMatchObject({ payment: 'after-cancellation', balance: 0 })
    expect(moneyState({ ...closed, entries: [col(2670, 'succeeded', '2026-10-18T11:00:00Z')] }, NOW).payment).toBe('paid')
    expect(moneyState({ ...closed, entries: [] }, NOW).payment).toBe('none')
  })
})

describe('[E1.4] moneyState: duplicate payment', () => {
  it('never makes the balance negative; the extra shows as overpaid', () => {
    const s = moneyState(input({ entries: [col(5400), col(5400, 'succeeded', '2026-10-18T10:05:00Z')], dueNow: 0 }), NOW)

    expect(s).toMatchObject({ paid: 10_800, balance: 0, overpaid: 1900, payment: 'paid-in-full' })
  })

  it('a duplicate of the whole total leaves a zero balance', () => {
    const s = moneyState(input({ entries: [col(8900), col(8900)], dueNow: 0 }), NOW)

    expect(s.balance).toBe(0)
    expect(s.overpaid).toBe(8900)
  })

  it('an exact payment is not overpaid', () => {
    expect(moneyState(input({ entries: [col(8900)], dueNow: 0 }), NOW).overpaid).toBe(0)
  })
})
