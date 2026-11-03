import { STOCK_BATCH_MAX, stockManySetBodySchema, stockSetBodySchema } from '@sk/api-contract'
import { describe, expect, it } from 'vitest'

const sku = (n: number) => `3f1c1d0e-8a57-4c0e-9b8e-${String(n).padStart(12, '0')}`

describe('[E6.3][AC05][AC53] the stock contract', () => {
  it.each([
    [0, true],
    [1, true],
    [2, true],
    [9999, true],
    [10000, false],
    [-1, false],
    [1.5, false],
    ['3', false],
  ])('[E6.3][AC05][AC53][AC-2] set one: on hand %s is accepted: %s', (onHand, accepted) => {
    expect(stockSetBodySchema.safeParse({ onHand }).success).toBe(accepted)
  })

  it('[E6.3][AC05][AC53][AC-2] set one takes nothing but onHand', () => {
    expect(stockSetBodySchema.safeParse({ onHand: 1, held: 0 }).success).toBe(false)
  })

  it('[E6.3][AC05][AC53][AC-2] set many holds STOCK_BATCH_MAX items, at least one, each SKU once, each within the bounds', () => {
    const items = (count: number) => Array.from({ length: count }, (_, n) => ({ skuId: sku(n), onHand: 1 }))

    expect(STOCK_BATCH_MAX).toBe(200)
    expect(stockManySetBodySchema.safeParse({ items: items(200) }).success).toBe(true)
    expect(stockManySetBodySchema.safeParse({ items: items(201) }).success).toBe(false)
    expect(stockManySetBodySchema.safeParse({ items: [] }).success).toBe(false)
    expect(stockManySetBodySchema.safeParse({ items: [{ skuId: sku(1), onHand: 1 }, { skuId: sku(1).toUpperCase(), onHand: 2 }] }).success).toBe(false)
    expect(stockManySetBodySchema.safeParse({ items: [{ skuId: sku(1), onHand: 10000 }] }).success).toBe(false)
    expect(stockManySetBodySchema.safeParse({ items: [{ skuId: 'nope', onHand: 1 }] }).success).toBe(false)
  })
})
