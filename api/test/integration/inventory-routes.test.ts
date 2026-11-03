import type { Tx } from '../../src/platform/db/client.ts'
import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { createMediaDirectory } from '../../src/modules/catalog/adapters/media-directory.ts'
import { createSkuDirectory } from '../../src/modules/catalog/adapters/sku-directory.ts'
import { createMediaRepository } from '../../src/modules/content/adapters/media-repository.ts'
import { mediaView } from '../../src/modules/content/adapters/media-view.ts'
import { guardUseCases } from '../../src/modules/inventory/adapters/database-errors.ts'
import { registerInventoryRoutes } from '../../src/modules/inventory/adapters/routes.ts'
import { createStockRepository } from '../../src/modules/inventory/adapters/stock-repository.ts'
import { makeGetStockItem, makeListStock, makeSetManyStock, makeSetStock } from '../../src/modules/inventory/index.ts'
import { createAuditLog } from '../../src/platform/audit.ts'
import { systemClock } from '../../src/platform/clock.ts'
import { createUnitOfWork } from '../../src/platform/db/unit-of-work.ts'
import { createFakeStorage } from '../support/fake-storage.ts'
import { createCatalogHttp } from './catalog-http.ts'
import { openTestDatabase } from './support.ts'

// Every sign-in is two round trips and several statements, which is slow against a Neon branch.
vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 })

const testDatabase = openTestDatabase()
const { pool, db } = testDatabase

afterAll(async () => {
  await pool.end()
})

// The inventory routes of main.ts next to the catalog's, over a real database. The keepsakes are made through the
// catalog routes; the holds are written by hand, as the orders module is not built.
const uow = createUnitOfWork(db)
const contentMedia = createMediaRepository()
const inventoryDeps = {
  uow,
  stock: createStockRepository(),
  skus: createSkuDirectory(),
  media: createMediaDirectory({ findById: (tx: Tx, storeId: string, id: string) => contentMedia.findById(tx, storeId, id), view: row => mediaView(row, createFakeStorage(systemClock).publicUrl) }),
  audit: createAuditLog(systemClock),
  clock: systemClock,
}
const useCases = guardUseCases({
  listStock: makeListStock(inventoryDeps),
  getStockItem: makeGetStockItem(inventoryDeps),
  setStock: makeSetStock(inventoryDeps),
  setManyStock: makeSetManyStock(inventoryDeps),
})
const env = createCatalogHttp(testDatabase, { extraRoutes: [app => registerInventoryRoutes(app, useCases)] })

const code = () => `VX-${randomUUID().slice(0, 8).toUpperCase()}`
const sizeOption = { ref: 'size', name: { en: 'Size', de: 'Grösse' }, values: [{ ref: 's', label: { en: 'Small', de: 'Klein' } }, { ref: 'l', label: { en: 'Large', de: 'Gross' } }] }

interface Variant { id: string, skuCode: string | null }
interface Product { id: string, variants: Variant[] }
interface Row { skuId: string, productId: string, code: string | null, keepsakeName: { en?: string }, variantTitle: { en?: string, de?: string }, photo: { id: string } | null, onHand: number, reserved: number, available: number }
interface Item extends Row { reservations: { orderId: string, orderRef: string | null, guestName: string | null, acceptedAt: string, quantity: number }[] }
interface List { items: Row[], counts: { all: number, inStock: number, soldOut: number } }
interface Problem { type: string, status: number, reserved?: number, skuId?: string }

let sharedStore: ReturnType<typeof env.storeWithStaff> | undefined

async function setup(options: { fresh?: boolean } = {}) {
  const store = await (options.fresh ? env.storeWithStaff() : (sharedStore ??= env.storeWithStaff()))
  const { storeId, owner, manager } = store
  const photo = await env.readyPhoto(storeId)
  const inventory = `/api/store/${storeId}/inventory`
  const create = async (body: object): Promise<Product> => {
    const response = await env.call(store.products, { method: 'POST', headers: owner.headers, body: { name: { en: 'Victorinox Classic' }, photoIds: [photo], ...body } })
    expect(response.status).toBe(201)
    return await response.json() as Product
  }
  // A keepsake with one variant, and its SKU id.
  const plain = async () => (await create({ variants: [{ skuCode: code(), priceRappen: 3900 }] })).variants[0]!.id
  // A keepsake with a Small and a Large variant.
  const sized = async (name = 'Victorinox Classic') => (await create({ name: { en: name }, options: [sizeOption], variants: [{ skuCode: code(), priceRappen: 3900, values: { size: 's' } }, { skuCode: code(), priceRappen: 3900, values: { size: 'l' } }] })).variants
  // The stock row with its units, and holds written by hand.
  const stock = (skuId: string, onHand: number) => pool.query(`insert into inventory.stock_items (sku_id, store_id, on_hand) values ($1, $2, $3) on conflict (sku_id) do update set on_hand = excluded.on_hand`, [skuId, storeId, onHand])
  const hold = async (skuId: string, quantity: number) => (await pool.query<{ id: string }>(`insert into inventory.stock_holds (store_id, sku_id, order_id, order_line_id, quantity) values ($1, $2, $3, $4, $5) returning id`, [storeId, skuId, randomUUID(), randomUUID(), quantity])).rows[0]!.id
  const set = (skuId: string, body: object, headers = owner.headers) => env.call(`${inventory}/${skuId}`, { method: 'PUT', headers, body })
  const setMany = (body: object, headers = owner.headers) => env.call(inventory, { method: 'PUT', headers, body })
  const item = async (skuId: string) => await (await env.call(`${inventory}/${skuId}`, { headers: owner.headers })).json() as Item
  const list = async (query = '') => await (await env.call(`${inventory}${query}`, { headers: owner.headers })).json() as List
  const archive = (productId: string, skuId: string) => env.call(`${store.products}/${productId}/variants/${skuId}`, { method: 'PATCH', headers: owner.headers, body: { status: 'archived' } })
  const adjustments = async (skuId: string) => (await pool.query<{ kind: string, delta: number, on_hand_before: number, on_hand_after: number, actor_user_id: string }>(`select kind, delta, on_hand_before, on_hand_after, actor_user_id from inventory.stock_adjustments where sku_id = $1 order by at, id`, [skuId])).rows
  return { ...store, photo, inventory, create, plain, sized, stock, hold, set, setMany, item, list, archive, adjustments, manager, call: env.call }
}

describe('[E6.3][AC05][AC53] setting stock against reserved units', () => {
  it('[E6.3][AC05][AC53][AC-2] 5 in stock and 2 reserved: 1 is refused naming the 2 reserved, 2 leaves none available, 9999 is accepted, 10000 and -1 are refused, and a refusal changes nothing', async () => {
    const s = await setup()
    const skuId = await s.plain()
    await s.stock(skuId, 5)
    await s.hold(skuId, 2)

    const below = await s.set(skuId, { onHand: 1 })
    expect(below.status).toBe(422)
    expect(await below.json() as Problem).toMatchObject({ type: 'stock-below-reserved', reserved: 2, skuId })
    expect(await s.item(skuId)).toMatchObject({ onHand: 5, reserved: 2 })

    const exact = await s.set(skuId, { onHand: 2 })
    expect(exact.status).toBe(200)
    expect(await exact.json()).toMatchObject({ skuId, onHand: 2, reserved: 2, available: 0 })

    expect((await s.set(skuId, { onHand: 9999 })).status).toBe(200)
    expect(await s.item(skuId)).toMatchObject({ onHand: 9999, available: 9997 })

    // The bounds are the contract's: the platform answers a body that fails its schema with a 400 validation-failed.
    for (const onHand of [10000, -1]) {
      const refused = await s.set(skuId, { onHand })
      expect(refused.status).toBe(400)
      expect(await refused.json() as Problem).toMatchObject({ type: 'validation-failed' })
    }
    expect(await s.item(skuId)).toMatchObject({ onHand: 9999 })
  })

  it('[E6.3][AC05][AC53][AC-5] a set writes one adjustment row with before, after, delta and the acting user, and the same value writes none', async () => {
    const s = await setup()
    const skuId = await s.plain()
    await s.stock(skuId, 3)

    expect((await s.set(skuId, { onHand: 7 })).status).toBe(200)
    expect((await s.set(skuId, { onHand: 7 })).status).toBe(200)

    expect(await s.adjustments(skuId)).toEqual([{ kind: 'set', delta: 4, on_hand_before: 3, on_hand_after: 7, actor_user_id: s.owner.userId }])
    const audit = await pool.query(`select actor, action, before, after from platform.audit_log where entity = 'stock' and entity_id = $1`, [skuId])
    expect(audit.rows).toEqual([{ actor: `staff:${s.owner.userId}`, action: 'set', before: { onHand: 3 }, after: { onHand: 7 } }])
  })

  it('[E6.3][AC05][AC53][AC-2] a variant that has no stock row yet is set from 0 and gets its row', async () => {
    const s = await setup()
    const skuId = await s.plain()
    await pool.query(`delete from inventory.stock_items where sku_id = $1`, [skuId])

    expect((await s.set(skuId, { onHand: 6 })).status).toBe(200)

    expect(await s.item(skuId)).toMatchObject({ onHand: 6, reserved: 0 })
    expect(await s.adjustments(skuId)).toEqual([expect.objectContaining({ on_hand_before: 0, on_hand_after: 6 })])
  })

  it('[E6.3][AC05][AC53][AC-4] setting variant A to 0 leaves variant B with 4 available', async () => {
    const s = await setup()
    const [a, b] = await s.sized()
    await Promise.all([s.stock(a!.id, 4), s.stock(b!.id, 4)])

    expect((await s.set(a!.id, { onHand: 0 })).status).toBe(200)

    expect(await s.item(a!.id)).toMatchObject({ onHand: 0, available: 0 })
    expect(await s.item(b!.id)).toMatchObject({ onHand: 4, available: 4 })
    expect(await s.adjustments(b!.id)).toEqual([])
  })
})

describe('[E6.3][AC05][AC53] setting stock for many variants', () => {
  it('[E6.3][AC05][AC53][AC-2] sets them in one call and returns the rows, and a manager may', async () => {
    const s = await setup()
    const [a, b] = await s.sized()

    const response = await s.setMany({ items: [{ skuId: b!.id, onHand: 9 }, { skuId: a!.id, onHand: 3 }] }, s.manager.headers)

    expect(response.status).toBe(200)
    expect((await response.json() as { items: Row[] }).items).toEqual([expect.objectContaining({ skuId: b!.id, onHand: 9, available: 9 }), expect.objectContaining({ skuId: a!.id, onHand: 3 })])
    expect(await s.adjustments(a!.id)).toEqual([expect.objectContaining({ delta: 3, actor_user_id: s.manager.userId })])
  })

  it('[E6.3][AC05][AC53][AC-2] one variant below its reserved units refuses the whole call, names it, and changes nothing', async () => {
    const s = await setup()
    const [a, b] = await s.sized()
    await Promise.all([s.stock(a!.id, 5), s.stock(b!.id, 5)])
    await s.hold(b!.id, 2)

    const response = await s.setMany({ items: [{ skuId: a!.id, onHand: 1 }, { skuId: b!.id, onHand: 1 }] })

    expect(response.status).toBe(422)
    expect(await response.json() as Problem).toMatchObject({ type: 'stock-below-reserved', reserved: 2, skuId: b!.id })
    expect(await s.item(a!.id)).toMatchObject({ onHand: 5 })
    expect(await s.adjustments(a!.id)).toEqual([])
  })

  it('[E6.3][AC05][AC53][AC-8] a variant of another store refuses the whole call with a 404 and changes nothing', async () => {
    const s = await setup()
    const other = await setup({ fresh: true })
    const [a] = await s.sized()
    const foreign = await other.plain()
    await s.stock(a!.id, 5)

    const response = await s.setMany({ items: [{ skuId: a!.id, onHand: 1 }, { skuId: foreign, onHand: 1 }] })

    expect(response.status).toBe(404)
    expect(await s.item(a!.id)).toMatchObject({ onHand: 5 })
  })

  it('[E6.3][AC05][AC53][AC-2] an empty list, a repeated variant and more than 200 are a 400', async () => {
    const s = await setup()
    const skuId = await s.plain()

    expect((await s.setMany({ items: [] })).status).toBe(400)
    expect((await s.setMany({ items: [{ skuId, onHand: 1 }, { skuId, onHand: 2 }] })).status).toBe(400)
    expect((await s.setMany({ items: Array.from({ length: 201 }).fill({ skuId: randomUUID(), onHand: 1 }) })).status).toBe(400)
  })
})

describe('[E6.3][AC05][AC53] reading one item', () => {
  it('[E6.3][AC05][AC53][AC-7] a held order shows as a reservation with its quantity and no guest name, a released one does not, and the reserved figure agrees', async () => {
    const s = await setup()
    const skuId = await s.plain()
    await s.stock(skuId, 6)
    const held = await s.hold(skuId, 2)
    const released = await s.hold(skuId, 1)
    await pool.query(`update inventory.stock_holds set state = 'released', resolved_at = now() where id = $1`, [released])

    const item = await s.item(skuId)

    expect(item).toMatchObject({ skuId, onHand: 6, reserved: 2, available: 4 })
    expect(item.reservations).toEqual([{ orderId: expect.any(String), orderRef: null, guestName: null, acceptedAt: expect.any(String), quantity: 2 }])
    expect((await pool.query(`select order_id from inventory.stock_holds where id = $1`, [held])).rows[0].order_id).toBe(item.reservations[0]!.orderId)
  })

  it('[E6.3][AC05][AC53][AC-7] a SKU with no holds has 0 reserved and an empty list', async () => {
    const s = await setup()
    const skuId = await s.plain()
    await s.stock(skuId, 3)

    expect(await s.item(skuId)).toMatchObject({ reserved: 0, available: 3, reservations: [] })
  })

  it('[E6.3][AC05][AC53][AC-8] another store\'s SKU, an unknown id and an archived variant are a 404 to read and to set', async () => {
    const s = await setup()
    const other = await setup({ fresh: true })
    const foreign = await other.plain()
    const product = await s.create({ options: [sizeOption], variants: [{ skuCode: code(), priceRappen: 100, values: { size: 's' } }, { skuCode: code(), priceRappen: 100, values: { size: 'l' } }] })
    const archived = product.variants[0]!
    expect((await s.archive(product.id, archived.id)).status).toBe(200)

    for (const skuId of [foreign, randomUUID(), archived.id]) {
      expect((await s.call(`${s.inventory}/${skuId}`, { headers: s.owner.headers })).status).toBe(404)
      expect((await s.set(skuId, { onHand: 1 })).status).toBe(404)
    }
    expect(await other.item(foreign)).toMatchObject({ skuId: foreign })
  })

  it('[E6.3][AC05][AC53][AC-8] a member of another store may not read or set this store\'s stock', async () => {
    const s = await setup()
    const other = await setup({ fresh: true })
    const skuId = await s.plain()

    expect((await s.call(`${s.inventory}/${skuId}`, { headers: other.owner.headers })).status).toBe(403)
    expect((await s.set(skuId, { onHand: 1 }, other.owner.headers)).status).toBe(403)
    expect((await s.call(s.inventory, { headers: other.owner.headers })).status).toBe(403)
  })
})

describe('[E6.3][AC05][AC53] the stock list', () => {
  it('[E6.3][AC05][AC53][AC-6] lists the live variants with the tab counts, filters and searches, and never an archived variant, a deleted one or another store\'s', async () => {
    const s = await setup({ fresh: true })
    const [small, large] = await s.sized('Alpine Cap')
    const [onlyOne] = await s.sized('Fondue Set')
    await Promise.all([s.stock(small!.id, 0), s.stock(large!.id, 3), s.stock(onlyOne!.id, 5)])
    // The archived variant has 2 in stock. Another keepsake is deleted and leaves an orphan stock row.
    const archivedKeepsake = await s.create({ options: [sizeOption], variants: [{ skuCode: code(), priceRappen: 100, values: { size: 's' } }, { skuCode: code(), priceRappen: 100, values: { size: 'l' } }] })
    const archivedSku = archivedKeepsake.variants[0]!.id
    await s.stock(archivedSku, 2)
    expect((await s.archive(archivedKeepsake.id, archivedSku)).status).toBe(200)
    const gone = await s.create({ variants: [{ skuCode: code(), priceRappen: 100 }] })
    await s.stock(gone.variants[0]!.id, 4)
    const removed = await s.call(`${s.products}/${gone.id}`, { method: 'DELETE', headers: { ...s.owner.headers, 'If-Match': '1' } })
    expect(removed.status).toBe(200)
    const other = await setup({ fresh: true })
    await other.stock(await other.plain(), 7)

    const all = await s.list()
    const ids = all.items.map(row => row.skuId)

    expect(ids).toContain(small!.id)
    expect(ids).toContain(onlyOne!.id)
    expect(ids).not.toContain(archivedSku)
    expect(ids).not.toContain(gone.variants[0]!.id)
    // The 5 live variants of the store: Alpine Cap S and L, Fondue Set S and L, and the one not archived of the third keepsake.
    expect(all.items).toHaveLength(5)
    expect(all.counts).toEqual({ all: 5, inStock: 2, soldOut: 3 })
    expect(all.items.find(row => row.skuId === small!.id)).toMatchObject({ keepsakeName: { en: 'Alpine Cap' }, variantTitle: { en: 'Small', de: 'Klein' }, onHand: 0, reserved: 0, available: 0, photo: { id: s.photo } })

    const inStock = await s.list('?filter=in-stock')
    const soldOut = await s.list('?filter=sold-out')
    expect(inStock.items.map(row => row.skuId).sort()).toEqual([large!.id, onlyOne!.id].sort())
    expect(soldOut.items).toHaveLength(3)
    expect(soldOut.counts).toEqual(all.counts)

    const lower = await s.list(`?q=${encodeURIComponent((small!.skuCode ?? '').toLowerCase())}`)
    expect(lower.items.map(row => row.skuId)).toEqual([small!.id])
    expect(lower.counts).toEqual(all.counts)
    expect((await s.list('?q=fondue')).items).toHaveLength(2)
    expect((await s.list('?q=GROSS')).items.map(row => row.skuId)).toContain(large!.id)
    expect((await s.list('?filter=sold-out&q=fondue')).items.map(row => row.skuId)).toEqual([(await s.list('?q=fondue')).items.find(row => row.skuId !== onlyOne!.id)!.skuId])
  })

  it('[E6.3][AC05][AC53][AC-6] a variant whose units are all reserved is sold out', async () => {
    const s = await setup()
    const skuId = await s.plain()
    await s.stock(skuId, 2)
    await s.hold(skuId, 2)

    const sold = await s.list('?filter=sold-out')

    expect(sold.items.find(row => row.skuId === skuId)).toMatchObject({ onHand: 2, reserved: 2, available: 0 })
  })
})
