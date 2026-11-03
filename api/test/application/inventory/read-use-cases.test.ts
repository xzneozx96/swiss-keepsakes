import { describe, expect, it } from 'vitest'
import { makeGetStockItem } from '../../../src/modules/inventory/application/get-stock-item.ts'
import { makeListStock } from '../../../src/modules/inventory/application/list-stock.ts'
import { makeReservedBySku, makeStockLevels } from '../../../src/modules/inventory/application/stock-reads.ts'
import { guest, id, outsider, owner, setup, sku, storeId } from './fakes.ts'

// Variants with 0, 3 and 5 available, and an archived one (never in the directory) with 2.
function world() {
  return setup(
    [sku(1, { keepsakeName: { en: 'Victorinox Classic' }, code: 'VX-L-RED' }), sku(2, { code: 'KN-2', keepsakeName: { en: 'Fondue set' }, variantTitle: { de: 'Gross' } }), sku(3, { code: 'KN-3', keepsakeName: { en: 'Alpine cap' }, variantTitle: {} })],
    { [id(1)]: [0, 0], [id(2)]: [4, 1], [id(3)]: [5, 0], [id(99)]: [2, 0] },
  )
}

describe('[E6.3][AC05][AC53] the stock list', () => {
  it.each([
    ['all', [id(3), id(2), id(1)]],
    ['in-stock', [id(3), id(2)]],
    ['sold-out', [id(1)]],
  ] as const)('[E6.3][AC05][AC53][AC-6] filter %s lists the matching live variants and never the archived or orphan one', async (filter, expected) => {
    const result = await makeListStock(world().deps)(owner, storeId, { filter })

    expect(result.ok && result.value.items.map(row => row.sku.skuId)).toEqual(expected)
  })

  it('[E6.3][AC05][AC53][AC-6] the tab counts are taken before the filter and the search', async () => {
    const result = await makeListStock(world().deps)(owner, storeId, { filter: 'sold-out', q: 'fondue' })

    expect(result.ok && result.value.counts).toEqual({ all: 3, inStock: 2, soldOut: 1 })
    expect(result.ok && result.value.items).toEqual([])
  })

  it.each([
    ['vx-l', [id(1)]],
    ['KN-', [id(3), id(2)]],
    ['FONDUE', [id(2)]],
    ['gross', [id(2)]],
    ['xl', []],
    ['  ', [id(3), id(2), id(1)]],
  ])('[E6.3][AC05][AC53][AC-6] searching "%s" matches the code, the variant title or the keepsake name in any case', async (q, expected) => {
    const result = await makeListStock(world().deps)(owner, storeId, { q })

    expect(result.ok && result.value.items.map(row => row.sku.skuId)).toEqual(expected)
  })

  it('[E6.3][AC05][AC53][AC-2] a row shows on hand, reserved and what is available', async () => {
    const result = await makeListStock(world().deps)(owner, storeId, {})
    const row = result.ok && result.value.items.find(item => item.sku.skuId === id(2))

    expect(row).toMatchObject({ onHand: 4, reserved: 1, available: 3 })
  })

  it('[E6.3][AC05][AC53][AC-6] a variant with no stock row yet counts as 0 on hand', async () => {
    const { deps } = setup([sku(1)])
    const result = await makeListStock(deps)(owner, storeId, {})

    expect(result.ok && result.value.items).toEqual([expect.objectContaining({ onHand: 0, reserved: 0, available: 0 })])
  })

  it('[E6.3][AC05][AC53][AC-6] the photo is the variant\'s own, else the keepsake\'s first', async () => {
    const { deps } = setup([sku(1, { mediaId: id(701), keepsakePhotoId: id(702) }), sku(2, { keepsakePhotoId: id(702) }), sku(3)], {}, {}, [id(701), id(702)])
    const result = await makeListStock(deps)(owner, storeId, {})
    const photos = result.ok ? Object.fromEntries(result.value.items.map(row => [row.sku.skuId, row.photo?.id ?? null])) : {}

    expect(photos).toEqual({ [id(1)]: id(701), [id(2)]: id(702), [id(3)]: null })
  })

  it('[E6.3][AC05][AC53][AC-8] only staff with edit-catalog read the list', async () => {
    expect(await makeListStock(world().deps)(guest, storeId, {})).toEqual({ ok: false, reason: 'forbidden' })
    expect(await makeListStock(world().deps)(outsider, storeId, {})).toEqual({ ok: false, reason: 'forbidden' })
  })
})

describe('[E6.3][AC05][AC53] reading one item', () => {
  const at = new Date('2026-11-02T10:00:00Z')

  it('[E6.3][AC05][AC53][AC-7] a held order shows as a reservation with its quantity and no guest name', async () => {
    const { deps } = setup([sku(1)], { [id(1)]: [5, 2] }, { [id(1)]: [{ orderId: id(500), acceptedAt: at, quantity: 2 }] })
    const result = await makeGetStockItem(deps)(owner, storeId, id(1))

    expect(result.ok && result.value).toMatchObject({ onHand: 5, reserved: 2, available: 3, reservations: [{ orderId: id(500), acceptedAt: at, quantity: 2 }] })
  })

  it('[E6.3][AC05][AC53][AC-7] a SKU with no holds has an empty list and 0 reserved', async () => {
    const result = await makeGetStockItem(setup([sku(1)], { [id(1)]: [5, 0] }).deps)(owner, storeId, id(1))

    expect(result.ok && result.value).toMatchObject({ reserved: 0, reservations: [] })
  })

  it('[E6.3][AC05][AC53][AC-8] an unknown, archived or other store\'s SKU is not found', async () => {
    const { deps } = setup([sku(1)], { [id(1)]: [5, 0], [id(2)]: [5, 0] })

    expect(await makeGetStockItem(deps)(owner, storeId, id(2))).toEqual({ ok: false, reason: 'not-found' })
  })

  it('[E6.3][AC05][AC53][CORRECTNESS-7] an upper-case SKU id finds the same variant', async () => {
    const lower = '0190f0c2-0000-7000-8000-00000000abcd'
    const result = await makeGetStockItem(setup([sku(1, { skuId: lower })], { [lower]: [5, 0] }).deps)(owner, storeId, lower.toUpperCase())

    expect(result.ok && result.value).toMatchObject({ onHand: 5 })
  })

  it('[E6.3][AC05][AC53][AC-8] only staff with edit-catalog read an item', async () => {
    expect(await makeGetStockItem(setup([sku(1)]).deps)(outsider, storeId, id(1))).toEqual({ ok: false, reason: 'forbidden' })
  })
})

describe('[E6.3][AC05][AC53] the reads the catalog uses', () => {
  it('[E6.3][AC05][AC53][AC-4] reservedBySku answers the held units of the SKUs asked for, 0 for a SKU with no row', async () => {
    const { deps } = setup([], { [id(1)]: [5, 2], [id(2)]: [3, 0], [id(3)]: [9, 4] })
    const reserved = await makeReservedBySku(deps)(null, storeId, [id(1), id(2), id(7)])

    expect([...reserved]).toEqual([[id(1), 2], [id(2), 0], [id(7), 0]])
  })

  it('[E6.3][AC05][AC53][AC-4] stockLevels answers on hand and reserved of the SKUs asked for, left out for a SKU with no row', async () => {
    const { deps } = setup([], { [id(1)]: [5, 2], [id(3)]: [9, 4] })
    const levels = await makeStockLevels(deps)(null, storeId, [id(1), id(7)])

    expect([...levels]).toEqual([[id(1), { onHand: 5, reserved: 2 }]])
  })
})
