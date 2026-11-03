import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { loadData } from '../scripts/seed-curated.ts'
import { describeDecision, parseOpeningStock, planOpeningStock } from '../scripts/seed-opening-stock.ts'

const storeId = 'store-1'
const owner = 'u-owner'
const sku = (code: string) => `sku-${code}`

// Three SKUs: A at the migration's 0, B at 7 with history (a person), C at 0 with history (a person set it from 4 to 0).
const base = {
  quantities: { A: 100, B: 100, C: 100 },
  skuIdByCode: new Map([['A', sku('A')], ['B', sku('B')], ['C', sku('C')]]),
  stock: new Map([[sku('A'), { onHand: 0, hasHistory: false }], [sku('B'), { onHand: 7, hasHistory: true }], [sku('C'), { onHand: 0, hasHistory: true }]]),
  ownerUserId: owner,
  storeId,
}

describe('[E6.5][AC52][AC53] the opening-stock data file', () => {
  const file = parseOpeningStock(JSON.parse(readFileSync(new URL('../scripts/seed-data/curated/opening-stock.json', import.meta.url), 'utf8')))

  it('[E6.5][AC52][AC53][AC-1] has 100 for each of the five knives, and names no code a keepsake lacks', () => {
    const codes = loadData().keepsakes.map(record => record.skuCode)

    expect(Object.keys(file).sort()).toEqual([...codes].sort())
    expect(Object.values(file)).toEqual([100, 100, 100, 100, 100])
  })

  it.each([[{ A: -1 }], [{ A: 1.5 }], [{ A: '5' }], [[1]], [null]])('[E6.5][AC52][AC53][AC-3] refuses %j', (raw) => {
    expect(() => parseOpeningStock(raw)).toThrow()
  })

  it('[E6.5][AC52][AC53][AC-3] accepts a 0', () => {
    expect(parseOpeningStock({ A: 0 })).toEqual({ A: 0 })
  })
})

describe('[E6.5][AC52][AC53] planning the opening stock', () => {
  it('[E6.5][AC52][AC53][AC-2] sets a row of 0 with no history, skips a person\'s 7 and a person\'s 4-to-0, with the reason', () => {
    const plan = planOpeningStock(base)

    expect(plan.faults).toEqual([])
    expect(plan.decisions).toEqual([
      { action: 'set', code: 'A', skuId: sku('A'), from: 0, to: 100 },
      { action: 'skip', code: 'B', reason: '7 in stock, already set by a person' },
      { action: 'skip', code: 'C', reason: '0 in stock, already set by a person' },
    ])
    expect(plan.decisions.map(describeDecision)).toEqual(['A: 0 to 100', 'B: skipped (7 in stock, already set by a person)', 'C: skipped (0 in stock, already set by a person)'])
  })

  it('[E6.5][AC52][AC53][AC-2] a row above 0 with no history is skipped too', () => {
    const plan = planOpeningStock({ ...base, quantities: { A: 100 }, stock: new Map([[sku('A'), { onHand: 3, hasHistory: false }]]) })

    expect(plan.decisions).toEqual([{ action: 'skip', code: 'A', reason: '3 in stock, not the migration\'s 0' }])
  })

  it('[E6.5][AC52][AC53][AC-2] the second run: once set, the row has history and every SKU is skipped', () => {
    const afterRun = new Map([[sku('A'), { onHand: 100, hasHistory: true }]])
    const plan = planOpeningStock({ ...base, quantities: { A: 100 }, stock: afterRun })

    expect(plan.faults).toEqual([])
    expect(plan.decisions.every(decision => decision.action === 'skip')).toBe(true)
  })

  it('[E6.5][AC52][AC53][AC-3] a quantity of 0 leaves the SKU alone, with no set', () => {
    const plan = planOpeningStock({ ...base, quantities: { A: 0, B: 100 } })

    expect(plan.decisions[0]).toMatchObject({ action: 'skip', code: 'A' })
    expect(plan.decisions.filter(decision => decision.action === 'set')).toEqual([])
  })

  it('[E6.5][AC52][AC53][AC-4] a code that no keepsake has is a fault that names the code', () => {
    const plan = planOpeningStock({ ...base, quantities: { A: 100, GHOST: 5 } })

    expect(plan.faults).toHaveLength(1)
    expect(plan.faults[0]).toContain('GHOST')
  })

  it('[E6.5][AC52][AC53][AC-4] a SKU with no stock row is a fault that names the code and the missing row', () => {
    const plan = planOpeningStock({ ...base, stock: new Map([[sku('B'), { onHand: 7, hasHistory: true }]]) })

    expect(plan.faults).toEqual(['SKU A has no stock row.', 'SKU C has no stock row.'])
  })

  it('[E6.5][AC52][AC53][AC-4] a store with no owner membership is a fault that names the store', () => {
    const plan = planOpeningStock({ ...base, ownerUserId: null })

    expect(plan.faults).toHaveLength(1)
    expect(plan.faults[0]).toContain(storeId)
  })

  it('[E6.5][AC52][AC53][AC-1] a keepsake the run is about to create is planned as 0 to its quantity, and a 0 for it is skipped', () => {
    const plan = planOpeningStock({ ...base, quantities: { NEW: 100, NEWZERO: 0 }, pendingCodes: new Set(['NEW', 'NEWZERO']) })

    expect(plan.faults).toEqual([])
    expect(plan.decisions.map(describeDecision)).toEqual(['NEW: 0 to 100', 'NEWZERO: skipped (quantity 0 in the data file, left alone)'])
  })
})
