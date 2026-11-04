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

// The orders module is not built, so the test says which variants an order line names.
const sold = new Set<string>()
const env = createCatalogHttp(testDatabase, { sales: { soldProductIds: async () => new Set<string>(), usedPickupPlaceIds: async () => new Set<string>(), soldSkuIds: async (_tx, _storeId, ids) => new Set(ids.filter(id => sold.has(id))) } })

const rich = (text: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] })
const code = () => `VX-${randomUUID().slice(0, 8).toUpperCase()}`

interface View { id: string, rowVersion: number, variants: { id: string, status: string, skuCode: string | null, hasOrders?: boolean }[] }

// A keepsake with one option and three variants (S, M, L), as the API builds it.
async function setup() {
  const store = await env.storeWithStaff()
  const created = async () => {
    const response = await env.call(store.products, {
      method: 'POST',
      headers: store.owner.headers,
      body: {
        name: { en: 'Victorinox Classic' },
        text: { en: rich('A Swiss knife.') },
        photoIds: [await env.readyPhoto(store.storeId)],
        options: [{ ref: 'size', name: { en: 'Size' }, values: [{ ref: 's', label: { en: 'Small' } }, { ref: 'm', label: { en: 'Medium' } }, { ref: 'l', label: { en: 'Large' } }] }],
        variants: [
          { skuCode: code(), priceRappen: 3900, values: { size: 's' } },
          { skuCode: code(), priceRappen: 4400, values: { size: 'm' } },
          { skuCode: code(), priceRappen: 4900, values: { size: 'l' } },
        ],
      },
    })
    expect(response.status).toBe(201)
    return await response.json() as View
  }
  const patch = (productId: string, path: string, body: object) => env.call(`${store.products}/${productId}/variants${path}`, { method: 'PATCH', headers: store.owner.headers, body })
  const rows = async (productId: string) => (await pool.query<{ id: string, status: string }>('select id, status from catalog.skus where product_id = $1', [productId])).rows
  const values = async (productId: string) => Number((await pool.query('select count(*) from catalog.sku_option_values where product_id = $1', [productId])).rows[0].count)
  const audit = async (skuId: string) => (await pool.query('select action from platform.audit_log where entity = $1 and entity_id = $2 order by at', ['sku', skuId])).rows.map(row => row.action)

  return { ...store, created, patch, rows, values, audit }
}

describe('[T-019][AC3] removing one variant', () => {
  it('[T-019][AC3] a variant that no order line names is deleted from the database, with its option value; its combination is free', async () => {
    const { created, patch, rows, values, audit } = await setup()
    const product = await created()
    const [small] = product.variants

    expect(await values(product.id)).toBe(3)
    const response = await patch(product.id, `/${small!.id}`, { status: 'removed' })

    expect(response.status).toBe(200)
    const after = await response.json() as View
    expect(after.variants.map(variant => variant.id)).not.toContain(small!.id)
    expect(after.variants).toHaveLength(2)
    expect((await rows(product.id)).map(row => row.id)).not.toContain(small!.id)
    expect(await values(product.id)).toBe(2)
    expect(await audit(small!.id)).toEqual(['deleted'])
  })

  it('[T-019][AC3] a variant that an order line names is archived, kept, and says so', async () => {
    const { created, patch, rows, audit } = await setup()
    const product = await created()
    const [, medium] = product.variants

    sold.add(medium!.id)
    const response = await patch(product.id, `/${medium!.id}`, { status: 'removed' })

    expect(response.status).toBe(200)
    const after = await response.json() as View
    expect(after.variants.find(variant => variant.id === medium!.id)).toMatchObject({ status: 'archived', hasOrders: true })
    expect((await rows(product.id)).find(row => row.id === medium!.id)?.status).toBe('archived')
    expect(await audit(medium!.id)).toEqual(['archived'])
  })

  it('[T-019][AC3] an archived variant cannot be removed, and the same call twice does not delete twice', async () => {
    const { created, patch } = await setup()
    const product = await created()
    const [small, medium] = product.variants

    sold.add(medium!.id)
    await patch(product.id, `/${medium!.id}`, { status: 'removed' })
    const again = await patch(product.id, `/${medium!.id}`, { status: 'removed' })

    expect(again.status).toBe(422)
    expect(await (await patch(product.id, `/${small!.id}`, { status: 'removed' })).json()).toMatchObject({ variants: [{}, {}] })
    expect((await patch(product.id, `/${small!.id}`, { status: 'removed' })).status).toBe(404)
  })
})

describe('[T-019][AC7] archived variants', () => {
  it('[T-019][AC7] an archived variant that no order line names is deleted, in one request with another', async () => {
    const { created, patch, rows } = await setup()
    const product = await created()
    const [small, medium] = product.variants

    await patch(product.id, '', { variants: [{ id: small!.id, status: 'archived' }, { id: medium!.id, status: 'archived' }] })
    expect((await rows(product.id)).filter(row => row.status === 'archived')).toHaveLength(2)
    const response = await patch(product.id, '', { variants: [{ id: small!.id, status: 'removed' }] })

    expect(response.status).toBe(200)
    expect((await rows(product.id)).map(row => row.id)).not.toContain(small!.id)
    expect((await patch(product.id, `/${medium!.id}`, { status: 'removed' })).status).toBe(200)
    expect(await rows(product.id)).toHaveLength(1)
  })

  it('[T-019][AC7] an archived variant that an order line names stays', async () => {
    const { created, patch, rows } = await setup()
    const product = await created()
    const [small] = product.variants

    sold.add(small!.id)
    await patch(product.id, `/${small!.id}`, { status: 'archived' })

    expect((await patch(product.id, `/${small!.id}`, { status: 'removed' })).status).toBe(422)
    expect(await rows(product.id)).toHaveLength(3)
  })
})

describe('[T-019][AC4] removing several variants in one request', () => {
  it('[T-019][AC4] the unsold are deleted and the sold archived; one refused row writes nothing', async () => {
    const { created, patch, rows, values } = await setup()
    const product = await created()
    const [small, medium, large] = product.variants

    sold.add(large!.id)
    const response = await patch(product.id, '', { variants: [{ id: small!.id, status: 'removed' }, { id: medium!.id, status: 'removed' }, { id: large!.id, status: 'removed' }] })

    expect(response.status).toBe(200)
    const after = await response.json() as View
    expect(after.variants).toHaveLength(1)
    expect(after.variants[0]).toMatchObject({ id: large!.id, status: 'archived', hasOrders: true })
    expect(await rows(product.id)).toEqual([{ id: large!.id, status: 'archived' }])
    expect(await values(product.id)).toBe(1)
  })

  it('[T-019][AC4] a row of another keepsake is not found and nothing is deleted', async () => {
    const { created, patch, rows } = await setup()
    const product = await created()
    const other = await created()

    const response = await patch(product.id, '', { variants: [{ id: product.variants[0]!.id, status: 'removed' }, { id: other.variants[0]!.id, status: 'removed' }] })

    expect(response.status).toBe(404)
    expect(await rows(product.id)).toHaveLength(3)
    expect(await rows(other.id)).toHaveLength(3)
  })
})

describe('[T-019][AC3] what references a variant', () => {
  it('[T-019][AC3] only the option values of the variant reference catalog.skus, and they go with it', async () => {
    const references = await pool.query<{ table_name: string, delete_rule: string }>(`
      select c.conrelid::regclass::text as table_name,
             case c.confdeltype when 'c' then 'cascade' when 'r' then 'restrict' when 'a' then 'no action' else c.confdeltype::text end as delete_rule
        from pg_constraint c
       where c.contype = 'f' and c.confrelid = 'catalog.skus'::regclass`)

    expect(references.rows).toEqual([{ table_name: 'catalog.sku_option_values', delete_rule: 'cascade' }])
  })
})
