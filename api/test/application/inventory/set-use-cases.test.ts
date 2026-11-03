import { describe, expect, it } from 'vitest'
import { makeSetManyStock } from '../../../src/modules/inventory/application/set-many-stock.ts'
import { makeSetStock } from '../../../src/modules/inventory/application/set-stock.ts'
import { guest, id, outsider, owner, setup, sku, storeId } from './fakes.ts'

// A SKU with 5 in stock and 2 reserved (AC-2).
const fiveAndTwo = () => setup([sku(1)], { [id(1)]: [5, 2] })

describe('[E6.3][AC05][AC53] setting stock for one variant', () => {
  it.each([
    [2, 2, 0],
    [9999, 9999, 9997],
  ])('[E6.3][AC05][AC53][AC-2] set to %s: the stock is %s and %s are available', async (value, onHand, available) => {
    const { deps, sets } = fiveAndTwo()
    const result = await makeSetStock(deps)(owner, storeId, id(1), value, null)

    expect(result.ok && result.value).toMatchObject({ onHand, reserved: 2, available })
    expect(sets).toHaveLength(1)
  })

  it('[E6.3][AC05][AC53][AC-2] set to 1 with 2 reserved is refused with the reserved count and changes nothing', async () => {
    const { deps, sets, audit } = fiveAndTwo()
    const result = await makeSetStock(deps)(owner, storeId, id(1), 1, null)

    expect(result).toEqual({ ok: false, reason: 'stock-below-reserved', reserved: 2, skuId: id(1) })
    expect(sets).toEqual([])
    expect(audit.record).not.toHaveBeenCalled()
  })

  it('[E6.3][AC05][AC53][AC-5] writes one set row with before, after and the acting user, and one audit entry', async () => {
    const { deps, sets, audit } = setup([sku(1)], { [id(1)]: [3, 0] })
    await makeSetStock(deps)(owner, storeId, id(1), 7, 'req-1')

    expect(sets).toEqual([{ skuId: id(1), before: 3, after: 7, actorUserId: 'u1', at: new Date('2026-11-03T08:00:00Z') }])
    expect(audit.record).toHaveBeenCalledWith(null, { storeId, actor: 'staff:u1', entity: 'stock', entityId: id(1), action: 'set', before: { onHand: 3 }, after: { onHand: 7 }, requestId: 'req-1' })
  })

  it('[E6.3][AC05][AC53][AC-5] the same value writes no adjustment and no audit entry', async () => {
    const { deps, sets, audit } = setup([sku(1)], { [id(1)]: [3, 0] })
    const result = await makeSetStock(deps)(owner, storeId, id(1), 3, null)

    expect(result.ok && result.value.onHand).toBe(3)
    expect(sets).toEqual([])
    expect(audit.record).not.toHaveBeenCalled()
  })

  it('[E6.3][AC05][AC53][AC-4] setting A to 0 leaves B at 4 available', async () => {
    const { deps, rows, sets } = setup([sku(1), sku(2)], { [id(1)]: [4, 0], [id(2)]: [4, 0] })
    const result = await makeSetStock(deps)(owner, storeId, id(1), 0, null)

    expect(result.ok && result.value).toMatchObject({ onHand: 0, available: 0 })
    expect(rows.get(id(2))).toEqual({ skuId: id(2), onHand: 4, reserved: 0 })
    expect(sets.map(set => set.skuId)).toEqual([id(1)])
  })

  it('[E6.3][AC05][AC53][AC-2] a variant with no stock row yet gets one when it is set', async () => {
    const { deps, sets } = setup([sku(1)])
    const result = await makeSetStock(deps)(owner, storeId, id(1), 6, null)

    expect(result.ok && result.value.onHand).toBe(6)
    expect(sets).toEqual([expect.objectContaining({ before: 0, after: 6 })])
  })

  it('[E6.3][AC05][AC53][AC-8] an unknown, archived or other store\'s SKU is not found and nothing is written', async () => {
    const { deps, sets } = setup([sku(1)], { [id(2)]: [5, 0] })

    expect(await makeSetStock(deps)(owner, storeId, id(2), 3, null)).toEqual({ ok: false, reason: 'not-found' })
    expect(sets).toEqual([])
  })

  it('[E6.3][AC05][AC53][AC-8] only staff with edit-catalog set stock', async () => {
    const { deps, sets } = fiveAndTwo()

    expect(await makeSetStock(deps)(guest, storeId, id(1), 3, null)).toEqual({ ok: false, reason: 'forbidden' })
    expect(await makeSetStock(deps)(outsider, storeId, id(1), 3, null)).toEqual({ ok: false, reason: 'forbidden' })
    expect(sets).toEqual([])
  })
})

describe('[E6.3][AC05][AC53] setting stock for many variants', () => {
  const three = () => setup([sku(1), sku(2), sku(3)], { [id(1)]: [5, 0], [id(2)]: [5, 2], [id(3)]: [1, 0] })

  it('[E6.3][AC05][AC53][AC-2] sets them all, locks in sku id order, and returns the rows in the order of the request', async () => {
    const { deps, sets, locked } = three()
    const result = await makeSetManyStock(deps)(owner, storeId, [{ skuId: id(3), onHand: 9 }, { skuId: id(1), onHand: 0 }, { skuId: id(2), onHand: 2 }], null)

    expect(result.ok && result.value.map(row => [row.sku.skuId, row.onHand])).toEqual([[id(3), 9], [id(1), 0], [id(2), 2]])
    expect(locked).toEqual([[id(1), id(2), id(3)]])
    expect(sets.map(set => set.skuId)).toEqual([id(1), id(2), id(3)])
  })

  it('[E6.3][AC05][AC53][AC-2] one SKU below its reserved units refuses the whole request, names the SKU, and writes nothing', async () => {
    const { deps, sets, audit } = three()
    const result = await makeSetManyStock(deps)(owner, storeId, [{ skuId: id(1), onHand: 7 }, { skuId: id(2), onHand: 1 }, { skuId: id(3), onHand: 4 }], null)

    expect(result).toEqual({ ok: false, reason: 'stock-below-reserved', reserved: 2, skuId: id(2) })
    expect(sets).toEqual([])
    expect(audit.record).not.toHaveBeenCalled()
  })

  it('[E6.3][AC05][AC53][AC-8] a SKU that is not found refuses the whole request and writes nothing', async () => {
    const { deps, sets } = three()
    const result = await makeSetManyStock(deps)(owner, storeId, [{ skuId: id(1), onHand: 7 }, { skuId: id(8), onHand: 1 }], null)

    expect(result).toEqual({ ok: false, reason: 'not-found', skuId: id(8) })
    expect(sets).toEqual([])
  })

  it('[E6.3][AC05][AC53][AC-5] a value that equals the stock writes no adjustment, one audit entry per change', async () => {
    const { deps, sets, audit } = three()
    await makeSetManyStock(deps)(owner, storeId, [{ skuId: id(1), onHand: 5 }, { skuId: id(3), onHand: 2 }], null)

    expect(sets.map(set => set.skuId)).toEqual([id(3)])
    expect(audit.record).toHaveBeenCalledTimes(1)
  })

  it('[E6.3][AC05][AC53][AC-8] only staff with edit-catalog set stock', async () => {
    expect(await makeSetManyStock(three().deps)(outsider, storeId, [{ skuId: id(1), onHand: 1 }], null)).toEqual({ ok: false, reason: 'forbidden' })
  })
})
