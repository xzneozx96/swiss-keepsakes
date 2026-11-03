import { describe, expect, it } from 'vitest'

import { baseQuantityOf, fillNewRows } from '@/features/keepsakes/lib/stock-rules'
import { variantsBody } from '@/features/keepsakes/lib/variant-rules'

const variant = (over: Record<string, unknown> = {}) => ({ skuCode: null, mediaId: null, priceRappen: 3900, values: {}, status: 'published' as const, ...over })

describe('[E6.3][AC05][AC53] the stock rules of the keepsake editor', () => {
  it('[E6.3][AC05][AC53] AC-2 the quantity typed with no options is the first live variant\'s stock, and 0 when it has none', () => {
    expect(baseQuantityOf([variant({ status: 'archived', onHand: 9 }), variant({ onHand: 6 })])).toBe(6)
    expect(baseQuantityOf([variant()])).toBe(0)
    expect(baseQuantityOf([])).toBe(0)
  })

  it('[E6.3][AC05][AC53] AC-2 filling gives each new row the starting quantity and leaves a row that has its own, so rows stay independent', () => {
    const rows = [{ skuCode: 'A', priceRappen: 100, values: {} }, { skuCode: 'B', priceRappen: 100, values: {}, quantity: 0 }]
    const filled = fillNewRows(rows, 6)

    expect(filled.map(row => row.quantity)).toEqual([6, 0])
    expect(rows[0]).not.toHaveProperty('quantity')
  })

  it('[E6.3][AC05][AC53] AC-5 a new keepsake sends each variant\'s stock as `quantity`, and none for a variant that has no figure', () => {
    expect(variantsBody([variant({ onHand: 12 }), variant({ onHand: 0 }), variant()]).map(row => row.quantity)).toEqual([12, 0, undefined])
    expect(variantsBody([variant()])[0]).not.toHaveProperty('quantity')
  })
})
