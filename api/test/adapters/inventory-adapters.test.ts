import { describe, expect, it } from 'vitest'
import { variantTitle } from '../../src/modules/catalog/adapters/sku-directory.ts'
import { mapDatabaseError } from '../../src/modules/inventory/adapters/database-errors.ts'
import { failureProblem } from '../../src/modules/inventory/adapters/problems.ts'

describe('[E6.3][AC05][AC53] the inventory adapters', () => {
  it('[E6.3][AC05][AC53][AC-2] the CHECK held_within_on_hand maps to stock-below-reserved, also inside a Drizzle wrapper; another error is not mapped', () => {
    const pg = { code: '23514', constraint: 'stock_items_held_within_on_hand' }

    expect(mapDatabaseError(pg)).toEqual({ reason: 'stock-below-reserved' })
    expect(mapDatabaseError(new Error('wrapped', { cause: pg }))).toEqual({ reason: 'stock-below-reserved' })
    expect(mapDatabaseError({ code: '23514', constraint: 'stock_items_on_hand_check' })).toBeUndefined()
    expect(mapDatabaseError(new Error('boom'))).toBeUndefined()
  })

  it('[E6.3][AC05][AC53][AC-2] the problem is a 422 that carries the reserved count and names the variant', () => {
    expect(failureProblem({ reason: 'stock-below-reserved', reserved: 2, skuId: 'abc' })).toMatchObject({
      status: 422,
      type: 'stock-below-reserved',
      title: '2 units are reserved by orders, so stock can’t go below the 2 reserved.',
      reserved: 2,
      skuId: 'abc',
    })
    expect(failureProblem({ reason: 'stock-below-reserved', reserved: 1 }).title).toContain('1 unit is reserved')
    expect(failureProblem({ reason: 'stock-below-reserved' })).toMatchObject({ status: 422, type: 'stock-below-reserved' })
  })

  it('[E6.3][AC05][AC53][AC-6] the variant title is the short labels joined by " / " per language, falling back to the other language', () => {
    expect(variantTitle([{ en: 'Small · 58 mm Classic SD', de: 'Klein · 58 mm' }, { en: 'Pilatus' }])).toEqual({ en: 'Small / Pilatus', de: 'Klein / Pilatus' })
    expect(variantTitle([])).toEqual({})
  })
})
