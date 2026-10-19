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

describe('[E1.4] moneyState: tour bookings (balance due at an instant, expired holds)', () => {
  const tour = (over: Partial<MoneyInput> = {}) => input({ total: 8900, dueNow: 6230, depositPolicy: true, ...over })

  it('an expired booking that holds money is an exception, and owes nothing', () => {
    const s = moneyState(tour({ stage: 'expired', entries: [col(2670)] }), NOW)

    expect(s).toMatchObject({ payment: 'after-expiry', paid: 2670, balance: 0, overdue: false })
  })

  it('an expired booking without money is none; a processing payment says the session closed', () => {
    expect(moneyState(tour({ stage: 'expired' }), NOW).payment).toBe('none')
    expect(moneyState(tour({ stage: 'expired', entries: [col(2670, 'processing')] }), NOW).payment).toBe('session-closed')
  })

  it('deposit paid with the balance due at a later instant', () => {
    const s = moneyState(tour({ entries: [col(2670)], balanceDueAt: '2026-10-19T10:00:01Z' }), NOW)

    expect(s).toMatchObject({ payment: 'deposit-paid', balance: 6230, overdue: false })
  })

  it('nothing paid with a balance due instant is pay later', () => {
    expect(moneyState(tour({ dueNow: 8900, balanceDueAt: '2026-10-20T10:00:00Z' }), NOW).payment).toBe('pay-later')
  })

  it('overdue from the due instant on, not only from the next day', () => {
    const paid = [col(2670)]

    expect(moneyState(tour({ entries: paid, balanceDueAt: '2026-10-19T09:59:59Z' }), NOW)).toMatchObject({ payment: 'overdue', overdue: true })
    expect(moneyState(tour({ entries: paid, balanceDueAt: '2026-10-19T10:00:00Z' }), NOW).overdue).toBe(true)
    expect(moneyState(tour({ entries: paid, balanceDueAt: '2026-10-19T10:00:01Z' }), NOW).overdue).toBe(false)
  })

  it('a processing payment wins over overdue, and a zero balance wins over both', () => {
    const due = { balanceDueAt: '2026-10-18T10:00:00Z' }

    expect(moneyState(tour({ ...due, entries: [col(2670), col(6230, 'processing')] }), NOW).payment).toBe('processing')
    expect(moneyState(tour({ ...due, entries: [col(8900)], dueNow: 0 }), NOW).payment).toBe('paid-in-full')
  })

  it('fully paid', () => {
    expect(moneyState(tour({ entries: [col(2670), col(6230)], dueNow: 0, balanceDueAt: '2026-10-18T10:00:00Z' }), NOW)).toMatchObject({ payment: 'paid-in-full', balance: 0, overdue: false })
  })

  it('refunded: the whole payment comes back and the balance stays zero', () => {
    const s = moneyState(tour({ stage: 'closed', dueNow: 0, entries: [col(2670), ref(2670)] }), NOW)

    expect(s).toMatchObject({ refund: 'full', refunded: 2670, balance: 0 })
  })
})

describe('[E1.4] moneyState: edge cases', () => {
  it('a closed stage with something still due is not overdue', () => {
    const s = moneyState(input({ stage: 'closed', dueNow: 6230, balanceDueDate: '2026-10-01' }), NOW)

    expect(s.overdue).toBe(false)
    expect(s.payment).not.toBe('overdue')
  })

  it('a closed stage with a first payment past due is not overdue either', () => {
    expect(moneyState(input({ stage: 'closed', dueNow: 5400, awaitingFirstPayment: true, firstPaymentDueAt: '2026-10-01T00:00:00Z' }), NOW).overdue).toBe(false)
  })

  it('a refund recorded when nothing was paid does not report full', () => {
    expect(moneyState(input({ entries: [ref(1000)], dueNow: 0 }), NOW).refund).toBe('partial')
  })

  it('refunding only the duplicate reports full, not partial', () => {
    const s = moneyState(input({ total: 5400, dueNow: 0, entries: [col(5400), col(5400, 'succeeded', '2026-10-18T10:05:00Z'), ref(5400)] }), NOW)

    expect(s).toMatchObject({ refund: 'full', paid: 10_800, refunded: 5400 })
  })

  it('refunding less than the total after a duplicate is still partial', () => {
    expect(moneyState(input({ total: 5400, dueNow: 0, entries: [col(5400), col(5400), ref(5399)] }), NOW).refund).toBe('partial')
  })
})
