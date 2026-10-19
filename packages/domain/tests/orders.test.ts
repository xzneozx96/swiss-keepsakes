import { describe, expect, it } from 'vitest'

import * as orders from '../src/orders'
import { line, order, product, variant } from './fixtures'

describe('[E1.2] orders/selectors', () => {
  it('totals the lines and takes a deposit share as the first payment', () => {
    const o = order()

    expect(orders.orderTotal(o)).toBe(10_000)
    expect(orders.firstPaymentAmount(o)).toBe(3000)
    expect(orders.amountDueNow(o)).toBe(3000)
  })

  it('counts only succeeded payments and never lets a balance go negative', () => {
    const payment = (status: 'succeeded' | 'processing', amount: number) => ({ id: 'x', amount, method: 'online' as const, status, at: '2026-10-19T10:00:00Z' })
    const o = order({ status: 'preparing', payments: [payment('succeeded', 4000), payment('processing', 9000)] })

    expect(orders.amountPaid(o)).toBe(4000)
    expect(orders.balance(o)).toBe(6000)
    expect(orders.balance(order({ payments: [payment('succeeded', 99_000)] }))).toBe(0)
    expect(orders.balance(order({ status: 'cancelled' }))).toBe(0)
  })

  it('fixes the deadlines when the seller accepts', () => {
    const due = orders.dueDatesAtAcceptance(order(), new Date('2026-10-19T10:00:00Z'))

    expect(due).toEqual({ firstPaymentDueAt: '2026-10-20T10:00:00.000Z', balanceDueDate: '2026-10-21' })
  })

  it('is overdue once the first payment deadline has passed', () => {
    const o = order({ firstPaymentDueAt: '2026-10-20T10:00:00.000Z' })

    expect(orders.isOverdue(o, new Date('2026-10-20T09:00:00Z'))).toBe(false)
    expect(orders.isOverdue(o, new Date('2026-10-20T11:00:00Z'))).toBe(true)
  })

  it('reports the lines the stock cannot cover', () => {
    const p = product({ variants: [variant({ stock: 3 })] })
    const data = { products: [p], orders: [] }
    const short = orders.shortLines(data, order({ lines: [line({ quantity: 5 })] }))

    expect(orders.variantAvailable(data, 'p1', 'v1')).toBe(3)
    expect(short.map(s => [s.requested, s.available])).toEqual([[5, 3]])
  })
})

describe('[E1.2] orders/format', () => {
  it('writes the full numeric date and the Zurich date and time', () => {
    expect(orders.formatOrderDate('2026-10-14', 'en-CH')).toBe('14.10.2026')
    expect(orders.formatOrderDateTime('2026-10-14T08:30:00Z', 'de-CH')).toMatch(/14\.10\.2026.*10:30/)
  })
})

describe('[E1.2] orders/group-cart', () => {
  const cartLine = (id: string, pickupDate: string, selected = true) => ({ id, productId: 'p1', variantId: 'v1', quantity: 1, pickupDate, pickupPlaceId: 'pl1', selected })
  const now = new Date('2026-10-19T08:00:00Z')

  it('splits lines into one order per pickup date and keeps the first-added order first', () => {
    const groups = orders.groupCartIntoOrders([cartLine('a', '2026-10-26'), cartLine('b', '2026-10-28'), cartLine('c', '2026-10-26')], [product()], now)

    expect(groups.map(g => [g.pickupDate, g.lines.length, g.subtotal])).toEqual([['2026-10-26', 2, 10_000], ['2026-10-28', 1, 5000]])
  })

  it('marks a date that is too early or closed instead of dropping the line', () => {
    const [tooEarly, closed] = orders.priceCartLines([cartLine('a', '2026-10-20'), cartLine('b', '2026-10-25')], [product()], now)

    expect(tooEarly.invalidDate).toEqual({ earliest: '2026-10-21', reason: 'too-early' })
    expect(closed.invalidDate?.reason).toBe('closed')
    expect(orders.selectedCartLines([cartLine('a', '2026-10-26', false)])).toEqual([])
  })
})
