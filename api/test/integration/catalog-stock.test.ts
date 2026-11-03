import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { createCatalogHttp } from './catalog-http.ts'
import { openTestDatabase } from './support.ts'

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 })

const testDatabase = openTestDatabase()
const { pool } = testDatabase

afterAll(async () => {
  await pool.end()
})

// Every write that creates a SKU also creates its stock row, in the same transaction (gate G-S8-D2), and the catalog
// reads its stock figures from inventory. The catalog routes run as main.ts wires them.
const env = createCatalogHttp(testDatabase)
// A second app whose seed runs twice: the real second insert hits the primary key, after the SKU rows are written.
const failing = createCatalogHttp(testDatabase, { wrapSeed: seed => async (tx, storeId, items, actor) => {
  await seed(tx, storeId, items, actor)
  await seed(tx, storeId, items, actor)
} })

const code = () => `VX-${randomUUID().slice(0, 8).toUpperCase()}`
const sizeOption = { ref: 'size', name: { en: 'Size' }, values: [{ ref: 's', label: { en: 'Small' } }, { ref: 'l', label: { en: 'Large' } }, { ref: 'x', label: { en: 'XL' } }] }

interface Variant { id: string, status: string, values: Record<string, string>, onHand: number, reserved: number, available: number }
interface Product { id: string, rowVersion: number, variants: Variant[] }

async function setup() {
  const store = await env.storeWithStaff()
  const photo = await env.readyPhoto(store.storeId)
  const post = (path: string, body: object, headers = store.owner.headers, app = env) => app.call(path, { method: 'POST', headers, body })
  const create = async (variants: object[], app = env) => post(store.products, { name: { en: 'Victorinox Classic' }, photoIds: [photo], options: [sizeOption], variants }, store.owner.headers, app)
  const stockOf = async (skuId: string) => (await pool.query<{ on_hand: number, held: number }>('select on_hand, held from inventory.stock_items where sku_id = $1', [skuId])).rows
  const history = async (skuId: string) => (await pool.query<{ kind: string, delta: number, on_hand_before: number, on_hand_after: number, actor_user_id: string }>('select kind, delta, on_hand_before, on_hand_after, actor_user_id from inventory.stock_adjustments where sku_id = $1', [skuId])).rows
  const get = async (productId: string) => await (await env.call(`${store.products}/${productId}`, { headers: store.owner.headers })).json() as Product
  return { ...store, photo, post, create, stockOf, history, get }
}

describe('[E6.3][AC05][AC53][AC-10] a new SKU has its stock row', () => {
  it('[E6.3][AC05][AC53][AC-10] a new keepsake with no quantity: each variant has a row of 0 and no history', async () => {
    const s = await setup()
    const response = await s.create([{ skuCode: code(), priceRappen: 3900, values: { size: 's' } }, { skuCode: code(), priceRappen: 3900, values: { size: 'l' } }])
    const product = await response.json() as Product

    expect(response.status).toBe(201)
    for (const variant of product.variants) {
      expect(await s.stockOf(variant.id)).toEqual([{ on_hand: 0, held: 0 }])
      expect(await s.history(variant.id)).toEqual([])
      expect(variant).toMatchObject({ onHand: 0, reserved: 0, available: 0 })
    }
  })

  it('[E6.3][AC05][AC53][AC-10] a quantity of 12: the row holds 12 and one set history row names the acting user', async () => {
    const s = await setup()
    const product = await (await s.create([{ skuCode: code(), priceRappen: 3900, values: { size: 's' }, quantity: 12 }, { skuCode: code(), priceRappen: 3900, values: { size: 'l' } }])).json() as Product
    const [first, second] = product.variants

    expect(await s.stockOf(first!.id)).toEqual([{ on_hand: 12, held: 0 }])
    expect(await s.history(first!.id)).toEqual([{ kind: 'set', delta: 12, on_hand_before: 0, on_hand_after: 12, actor_user_id: s.owner.userId }])
    expect(await s.history(second!.id)).toEqual([])
    expect(first).toMatchObject({ onHand: 12, available: 12 })
  })

  it('[E6.3][AC05][AC53][E6.3c-AC-5] a SKU code already in use refuses the whole create and writes no stock row for any variant', async () => {
    const s = await setup()
    const taken = code()
    await s.create([{ skuCode: taken, priceRappen: 3900, values: { size: 's' } }])
    const before = Number((await pool.query('select count(*) from inventory.stock_items where store_id = $1', [s.storeId])).rows[0].count)
    const response = await s.create([{ skuCode: code(), priceRappen: 3900, values: { size: 's' }, quantity: 4 }, { skuCode: taken, priceRappen: 3900, values: { size: 'l' }, quantity: 5 }])
    const after = Number((await pool.query('select count(*) from inventory.stock_items where store_id = $1', [s.storeId])).rows[0].count)
    const history = Number((await pool.query('select count(*) from inventory.stock_adjustments where store_id = $1', [s.storeId])).rows[0].count)

    expect(response.status).toBe(409)
    expect(after).toBe(before)
    expect(history).toBe(0)
  })

  it('[E6.3][AC05][AC53][AC-10] a new variant on an existing keepsake has a row of 0, or its quantity', async () => {
    const s = await setup()
    const product = await (await s.create([{ skuCode: code(), priceRappen: 3900, values: { size: 's' } }])).json() as Product
    const optionId = Object.keys(product.variants[0]!.values)[0]!
    const detail = await (await env.call(`${s.products}/${product.id}`, { headers: s.owner.headers })).json() as Product & { options: { id: string, values: { id: string, label: { en: string } }[] }[] }
    const value = (label: string) => detail.options[0]!.values.find(v => v.label.en === label)!.id
    const plain = await s.post(`${s.products}/${product.id}/variants`, { skuCode: code(), priceRappen: 3900, values: { [optionId]: value('Large') } })
    const stocked = await s.post(`${s.products}/${product.id}/variants`, { skuCode: code(), priceRappen: 3900, values: { [optionId]: value('XL') }, quantity: 7 })
    const added = (await s.get(product.id)).variants.filter(variant => variant.id !== product.variants[0]!.id)

    expect([plain.status, stocked.status]).toEqual([201, 201])
    expect(added.map(variant => variant.onHand).sort()).toEqual([0, 7])
    for (const variant of added)
      expect(await s.stockOf(variant.id)).toHaveLength(1)
  })

  it.each([10000, -1, 1.5])('[E6.3][AC05][AC53][TQ-9] a quantity of %s is refused on a create and on a new variant, and writes nothing', async (quantity) => {
    const s = await setup()
    const count = async (table: string) => Number((await pool.query(`select count(*) from ${table} where store_id = $1`, [s.storeId])).rows[0].count)
    const refusedCreate = await s.create([{ skuCode: code(), priceRappen: 3900, values: { size: 's' }, quantity }])
    const product = await (await s.create([{ skuCode: code(), priceRappen: 3900, values: { size: 's' } }])).json() as Product
    const optionId = Object.keys(product.variants[0]!.values)[0]!
    const detail = await (await env.call(`${s.products}/${product.id}`, { headers: s.owner.headers })).json() as { options: { values: { id: string, label: { en: string } }[] }[] }
    const large = detail.options[0]!.values.find(v => v.label.en === 'Large')!.id
    const refusedVariant = await s.post(`${s.products}/${product.id}/variants`, { skuCode: code(), priceRappen: 3900, values: { [optionId]: large }, quantity })

    expect([refusedCreate.status, refusedVariant.status]).toEqual([400, 400])
    expect(await count('catalog.products')).toBe(1)
    expect(await count('catalog.skus')).toBe(1)
    expect(await count('inventory.stock_items')).toBe(1)
  })

  it('[E6.3][AC05][AC53][TQ-9] a quantity of 9999 is accepted', async () => {
    const s = await setup()
    const response = await s.create([{ skuCode: code(), priceRappen: 3900, values: { size: 's' }, quantity: 9999 }])
    const product = await response.json() as Product

    expect(response.status).toBe(201)
    expect(product.variants[0]).toMatchObject({ onHand: 9999 })
  })

  it('[E6.3][AC05][AC53][AC-10] an options save seeds the variants it creates', async () => {
    const s = await setup()
    const product = await (await s.create([{ skuCode: code(), priceRappen: 3900, values: { size: 's' } }])).json() as Product
    const before = await s.get(product.id)
    const optionId = Object.keys(before.variants[0]!.values)[0]!
    const detail = await (await env.call(`${s.products}/${product.id}`, { headers: s.owner.headers })).json() as { options: { id: string, name: object, values: { id: string, label: { en: string } }[] }[] }
    const option = detail.options[0]!
    const response = await env.call(`${s.products}/${product.id}/options`, {
      method: 'PUT',
      headers: { ...s.owner.headers, 'If-Match': `"${before.rowVersion}"` },
      body: {
        options: [{ ref: optionId, name: option.name, values: [...option.values.map(v => ({ ref: v.id, label: v.label })), { ref: 'new', label: { en: 'Huge' } }] }],
        newVariants: [{ skuCode: code(), priceRappen: 3900, values: { [optionId]: 'new' }, quantity: 3 }],
      },
    })
    const saved = await response.json() as Product
    const created = saved.variants.find(variant => variant.id !== before.variants[0]!.id)!

    expect(response.status).toBe(200)
    expect(await s.stockOf(created.id)).toEqual([{ on_hand: 3, held: 0 }])
    expect(await s.history(created.id)).toHaveLength(1)
  })

  it('[E6.3][AC05][AC53][AC-10] a write that fails after the SKU insert leaves no SKU and no stock row', async () => {
    const s = await setup()
    const count = async (table: string) => Number((await pool.query(`select count(*) from ${table} where store_id = $1`, [s.storeId])).rows[0].count)
    const response = await s.create([{ skuCode: code(), priceRappen: 3900, values: { size: 's' }, quantity: 5 }], failing)

    expect(response.status).toBe(500)
    expect(await count('catalog.skus')).toBe(0)
    expect(await count('catalog.products')).toBe(0)
    expect(await count('inventory.stock_items')).toBe(0)
    expect(await count('inventory.stock_adjustments')).toBe(0)
  })
})

describe('[E6.3][AC05][AC53] stock figures in the catalog', () => {
  it('[E6.3][AC05][AC53][AC-4] A at 0 is sold out, B shows 4 available, the list counts 1 sold out', async () => {
    const s = await setup()
    const product = await (await s.create([{ skuCode: code(), priceRappen: 3900, values: { size: 's' }, quantity: 0 }, { skuCode: code(), priceRappen: 3900, values: { size: 'l' }, quantity: 4 }])).json() as Product
    const [a, b] = product.variants
    const list = await (await env.call(s.products, { headers: s.owner.headers })).json() as { items: { id: string, soldOutCount: number, variantCount: number }[] }

    expect(a).toMatchObject({ onHand: 0, available: 0 })
    expect(b).toMatchObject({ onHand: 4, available: 4 })
    expect(list.items.find(item => item.id === product.id)).toMatchObject({ soldOutCount: 1, variantCount: 2 })
  })

  it('[E6.3][AC05][AC53] reserved units show on the product; a variant with no row reads 0 and is sold out; an archived one is not counted', async () => {
    const s = await setup()
    const product = await (await s.create([{ skuCode: code(), priceRappen: 3900, values: { size: 's' }, quantity: 4 }, { skuCode: code(), priceRappen: 3900, values: { size: 'l' } }, { skuCode: code(), priceRappen: 3900, values: { size: 'x' }, quantity: 3 }])).json() as Product
    const [held, bare, gone] = product.variants
    await pool.query(`insert into inventory.stock_holds (store_id, sku_id, order_id, order_line_id, quantity) values ($1, $2, $3, $4, 3)`, [s.storeId, held!.id, randomUUID(), randomUUID()])
    await pool.query('delete from inventory.stock_items where sku_id = $1', [bare!.id])
    const archived = await env.call(`${s.products}/${product.id}/variants/${gone!.id}`, { method: 'PATCH', headers: s.owner.headers, body: { status: 'archived' } })
    const detail = await s.get(product.id)
    const list = await (await env.call(s.products, { headers: s.owner.headers })).json() as { items: { id: string, soldOutCount: number }[] }

    expect(archived.status).toBe(200)
    expect(detail.variants.find(variant => variant.id === held!.id)).toMatchObject({ onHand: 4, reserved: 3, available: 1 })
    expect(detail.variants.find(variant => variant.id === bare!.id)).toMatchObject({ onHand: 0, reserved: 0, available: 0 })
    expect(detail.variants.find(variant => variant.id === gone!.id)).toMatchObject({ status: 'archived', onHand: 3 })
    expect(list.items.find(item => item.id === product.id)!.soldOutCount).toBe(1)
  })

  it('[E6.3][AC05][AC53] archiving a variant with a held unit is refused as variant-reserved', async () => {
    const s = await setup()
    const product = await (await s.create([{ skuCode: code(), priceRappen: 3900, values: { size: 's' }, quantity: 4 }, { skuCode: code(), priceRappen: 3900, values: { size: 'l' } }])).json() as Product
    const [held] = product.variants
    await pool.query(`insert into inventory.stock_holds (store_id, sku_id, order_id, order_line_id, quantity) values ($1, $2, $3, $4, 1)`, [s.storeId, held!.id, randomUUID(), randomUUID()])
    const response = await env.call(`${s.products}/${product.id}/variants/${held!.id}`, { method: 'PATCH', headers: s.owner.headers, body: { status: 'archived' } })
    const problem = await response.json() as { type: string, refusals?: { code: string, params?: { count: number } }[] }

    expect(response.status).toBeGreaterThanOrEqual(400)
    expect(JSON.stringify(problem)).toContain('variant-reserved')
    expect((await pool.query('select status from catalog.skus where id = $1', [held!.id])).rows[0].status).toBe('published')
  })
})
