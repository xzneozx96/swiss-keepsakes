import { describe, expect, it } from 'vitest'
import { makeSeedStock } from '../../../src/modules/inventory/application/seed-stock.ts'
import { id, setup, storeId } from './fakes.ts'

describe('[E6.3][AC05][AC53] seeding the stock rows of new SKUs', () => {
  it('[E6.3][AC05][AC53][AC-10] writes one call with the SKUs sorted by id, and the acting user', async () => {
    const { deps, seeded } = setup([])

    await makeSeedStock(deps)(null, storeId, [{ skuId: id(3), quantity: 12 }, { skuId: id(1), quantity: 0 }], 'u1')

    expect(seeded).toEqual([{ storeId, items: [{ skuId: id(1), quantity: 0 }, { skuId: id(3), quantity: 12 }], actorUserId: 'u1' }])
  })

  it('[E6.3][AC05][AC53][AC-10] no SKU, no statement', async () => {
    const { deps, seeded } = setup([])

    await makeSeedStock(deps)(null, storeId, [], 'u1')

    expect(seeded).toEqual([])
  })

  it('[E6.3][AC05][AC53][AC-10] a SKU that already has a row fails loudly', async () => {
    const { deps } = setup([], { [id(1)]: [3, 0] })

    await expect(makeSeedStock(deps)(null, storeId, [{ skuId: id(1), quantity: 0 }], 'u1')).rejects.toThrow('duplicate')
  })
})
