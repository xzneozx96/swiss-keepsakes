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

// The orders module is not built, so the test says which keepsakes an order line names.
const sold = new Set<string>()
const env = createCatalogHttp(testDatabase, { sales: { soldProductIds: async (_tx, _storeId, ids) => new Set(ids.filter(id => sold.has(id))) } })

const rich = (text: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] })
const code = () => `VX-${randomUUID().slice(0, 8).toUpperCase()}`

interface View { id: string, status: string, hasOrders: boolean, rowVersion: number, variants: { id: string }[] }

let sharedStore: ReturnType<typeof env.storeWithStaff> | undefined

async function setup() {
  const store = await (sharedStore ??= env.storeWithStaff())
  const photo = await env.readyPhoto(store.storeId)
  // A keepsake with two options, three variants and a photo, published or not.
  const created = async (publish = false) => {
    const response = await env.call(store.products, {
      method: 'POST',
      headers: store.owner.headers,
      body: {
        name: { en: 'Victorinox Classic' },
        text: { en: rich('A Swiss knife.') },
        photoIds: [photo],
        options: [
          { ref: 'size', name: { en: 'Size' }, values: [{ ref: 's', label: { en: 'Small' } }, { ref: 'l', label: { en: 'Large' } }] },
          { ref: 'colour', name: { en: 'Colour' }, values: [{ ref: 'red', label: { en: 'Red' }, swatch: '#ff0000' }] },
        ],
        variants: [
          { skuCode: code(), priceRappen: 3900, values: { size: 's', colour: 'red' } },
          { skuCode: code(), priceRappen: 4900, values: { size: 'l', colour: 'red' } },
        ],
      },
    })
    expect(response.status).toBe(201)
    const product = await response.json() as View
    if (!publish)
      return product
    const live = await env.call(`${store.products}/${product.id}/publish`, { method: 'POST', headers: { ...store.owner.headers, 'If-Match': String(product.rowVersion) } })
    expect(live.status).toBe(200)
    return await live.json() as View
  }
  const remove = (id: string, ifMatch: number | null, headers = store.owner.headers, key?: string) =>
    env.call(`${store.products}/${id}`, { method: 'DELETE', key, headers: { ...headers, ...(ifMatch === null ? {} : { 'If-Match': String(ifMatch) }) } })
  const count = async (table: string, productId: string) =>
    Number((await pool.query(`select count(*) from catalog.${table} where product_id = $1`, [productId])).rows[0].count)
  return { ...store, photo, created, remove, count }
}

describe('[E6.1] removing a keepsake that was never sold', () => {
  it('[E6.1][delete] deletes it with its options, values, variants and photo list; the photo stays in the library', async () => {
    const { created, remove, count, photo, products, owner } = await setup()
    const product = await created(true)
    expect(await count('skus', product.id)).toBe(2)
    expect(await count('product_options', product.id)).toBe(2)
    expect(await count('product_option_values', product.id)).toBe(3)
    expect(await count('product_media', product.id)).toBe(1)

    const response = await remove(product.id, product.rowVersion)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ id: product.id, outcome: 'deleted' })
    for (const table of ['skus', 'sku_option_values', 'product_options', 'product_option_values', 'product_media'])
      expect(await count(table, product.id)).toBe(0)
    expect(Number((await pool.query('select count(*) from catalog.products where id = $1', [product.id])).rows[0].count)).toBe(0)
    expect(Number((await pool.query('select count(*) from content.media where id = $1', [photo])).rows[0].count)).toBe(1)
    expect((await env.call(`${products}/${product.id}`, { headers: owner.headers })).status).toBe(404)
    const audit = await pool.query(`select action from platform.audit_log where entity = 'product' and entity_id = $1 and action in ('deleted', 'archived')`, [product.id])
    expect(audit.rows).toEqual([{ action: 'deleted' }])
  })

  it('[E6.1][delete] a draft that was never published is deleted too', async () => {
    const { created, remove } = await setup()
    const product = await created()

    expect(await (await remove(product.id, product.rowVersion)).json()).toMatchObject({ outcome: 'deleted' })
  })

  it('[E6.1][delete] needs the version, refuses an old one, and a guest or another store gets nothing', async () => {
    const { created, remove, count } = await setup()
    const other = await env.storeWithStaff()
    const product = await created(true)

    expect((await remove(product.id, null)).status).toBe(428)
    expect((await remove(product.id, product.rowVersion - 1)).status).toBe(412)
    expect((await remove(product.id, product.rowVersion, other.owner.headers)).status).toBe(403)
    expect((await remove(product.id, product.rowVersion, {})).status).toBe(401)
    expect(await count('skus', product.id)).toBe(2)
  })

  it('[E6.1][delete] a manager may delete, and the same Idempotency-Key answers the same again', async () => {
    const { created, remove, manager } = await setup()
    const product = await created()
    const key = randomUUID()

    const first = await remove(product.id, product.rowVersion, manager.headers, key)
    const again = await remove(product.id, product.rowVersion, manager.headers, key)

    expect(first.status).toBe(200)
    expect(again.status).toBe(200)
    expect(await again.json()).toEqual({ id: product.id, outcome: 'deleted' })
  })
})

describe('[E6.1] removing a keepsake that has orders', () => {
  it('[E6.1][archive] archives it: every row stays, the list says archived, an order keeps its variant', async () => {
    const { created, remove, count, products, owner } = await setup()
    const product = await created(true)
    sold.add(product.id)

    const listed = await (await env.call(products, { headers: owner.headers })).json() as { items: { id: string, hasOrders: boolean, rowVersion: number }[] }
    expect(listed.items.find(item => item.id === product.id)).toMatchObject({ hasOrders: true, rowVersion: product.rowVersion })
    expect(await (await env.call(`${products}/${product.id}`, { headers: owner.headers })).json()).toMatchObject({ hasOrders: true })

    const response = await remove(product.id, product.rowVersion)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ id: product.id, outcome: 'archived' })
    expect(await count('skus', product.id)).toBe(2)
    expect(await count('product_options', product.id)).toBe(2)
    expect(await count('product_media', product.id)).toBe(1)
    const after = await (await env.call(`${products}/${product.id}`, { headers: owner.headers })).json() as View
    expect(after).toMatchObject({ status: 'archived', rowVersion: product.rowVersion + 1 })
    const relisted = await (await env.call(products, { headers: owner.headers })).json() as { items: { id: string, status: string }[] }
    expect(relisted.items.find(item => item.id === product.id)?.status).toBe('archived')
    const audit = await pool.query(`select action from platform.audit_log where entity = 'product' and entity_id = $1 and action in ('deleted', 'archived')`, [product.id])
    expect(audit.rows).toEqual([{ action: 'archived' }])
  })

  it('[E6.1][archive] an archived keepsake is final: no save, publish, unpublish, options, variant, and no second removal', async () => {
    const { created, remove, products, owner } = await setup()
    const product = await created(true)
    sold.add(product.id)
    await remove(product.id, product.rowVersion)
    const version = product.rowVersion + 1
    const headers = { ...owner.headers, 'If-Match': String(version) }
    const variant = product.variants[0]!.id

    const attempts = await Promise.all([
      env.call(`${products}/${product.id}`, { method: 'PATCH', headers, body: { name: { en: 'Renamed' } } }),
      env.call(`${products}/${product.id}/publish`, { method: 'POST', headers }),
      env.call(`${products}/${product.id}/unpublish`, { method: 'POST', headers }),
      env.call(`${products}/${product.id}/options`, { method: 'PUT', headers, body: { options: [] } }),
      env.call(`${products}/${product.id}/variants/${variant}`, { method: 'PATCH', headers: owner.headers, body: { priceRappen: 100 } }),
      env.call(`${products}/${product.id}/variants`, { method: 'POST', headers: owner.headers, body: { skuCode: code(), priceRappen: 100, values: {} } }),
      remove(product.id, version),
    ])

    expect(attempts.map(attempt => attempt.status)).toEqual([409, 409, 409, 409, 409, 409, 409])
    for (const attempt of attempts) {
      expect(attempt.status).toBe(409)
      expect(await attempt.json()).toMatchObject({ type: expect.stringContaining('keepsake-archived') })
    }
  })
})
