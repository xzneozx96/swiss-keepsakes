import { stockItemSchema, stockListSchema, stockRowSchema } from '@sk/api-contract'

import { media, storeId } from './keepsakes-harness'

// The fetch stub of keepsakes-harness answers the HTTP of the real inventory screens, hooks and DataClient; the test sets `state.answer`.
export { problem, setUpHarness, state, storeId } from './keepsakes-harness'

export const base = `/api/store/${storeId}/inventory`
export const skuOf = (n: number) => `0198a000-0000-7000-8000-0000000001${String(n).padStart(2, '0')}`

export function stockRow(over: Record<string, unknown> = {}) {
  return stockRowSchema.parse({
    skuId: skuOf(1),
    productId: '0198a000-0000-7000-8000-0000000000a1',
    code: 'VX-S-SWAN',
    keepsakeName: { en: 'Victorinox Classic' },
    variantTitle: { en: 'Small / Swan' },
    photo: media,
    onHand: 5,
    reserved: 2,
    available: 3,
    ...over,
  })
}

/** A list answer; the counts are those of the rows unless a test sets them. */
export function stockList(rows: Record<string, unknown>[], counts?: { all: number, inStock: number, soldOut: number }, over: Record<string, unknown> = {}) {
  const items = rows.map(row => stockRow(row))
  const soldOut = items.filter(row => row.available === 0).length

  return stockListSchema.parse({ items, total: items.length, page: 1, pageSize: 10, counts: counts ?? { all: items.length, inStock: items.length - soldOut, soldOut }, ...over })
}

export const stockProblem = (reserved: number) => Response.json({ type: 'stock-below-reserved', status: 422, title: 'refused', instance: '/x', requestId: 'req-2', reserved }, { status: 422 })

/** The item answer: a row with the open orders that reserve its units. */
export function stockItem(over: Record<string, unknown> = {}, reservations: Record<string, unknown>[] = []) {
  return stockItemSchema.parse({ ...stockRow(over), reservations })
}

export function reservation(over: Record<string, unknown> = {}) {
  return {
    orderId: '0198a000-0000-7000-8000-0000000002a1',
    orderRef: 'SK-1044',
    guestName: 'Anna Meier',
    acceptedAt: '2026-10-28T09:30:00.000Z',
    quantity: 2,
    ...over,
  }
}
