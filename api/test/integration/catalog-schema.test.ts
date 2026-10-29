import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { openTestDatabase } from './support.ts'

vi.setConfig({ testTimeout: 60_000, hookTimeout: 120_000 })

const { pool } = openTestDatabase()

afterAll(async () => {
  await pool.end()
})

interface PgFailure { code?: string, constraint?: string, message?: string }

async function failure(promise: Promise<unknown>): Promise<PgFailure> {
  try {
    await promise
  }
  catch (error) {
    return error as PgFailure
  }
  throw new Error('the statement was expected to fail and succeeded')
}

const suffix = () => randomUUID().slice(0, 8)

async function newProduct(store: string): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(`insert into catalog.products (store_id) values ($1) returning id`, [store])
  return rows[0]!.id
}

async function newOption(store: string, product: string, position: number): Promise<{ option: string, value: string }> {
  const option = (await pool.query<{ id: string }>(
    `insert into catalog.product_options (store_id, product_id, name, position) values ($1, $2, '{"en":"Size"}', $3) returning id`,
    [store, product, position],
  )).rows[0]!.id
  const value = (await pool.query<{ id: string }>(
    `insert into catalog.product_option_values (store_id, product_id, option_id, label, position) values ($1, $2, $3, '{"en":"Small"}', 1) returning id`,
    [store, product, option],
  )).rows[0]!.id
  return { option, value }
}

async function newSku(store: string, product: string, code = `SK-${suffix()}`): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `insert into catalog.skus (store_id, sku_code, product_id, price_rappen, status) values ($1, $2, $3, 3900, 'published') returning id`,
    [store, code, product],
  )
  return rows[0]!.id
}

describe('[E6.1][ADR-021] migration 0010: category tables exist and nothing else is needed for them', () => {
  it('[E6.1][ADR-021] the category tables are in the catalog schema', async () => {
    const { rows } = await pool.query<{ table_name: string }>(
      `select table_name from information_schema.tables where table_schema = 'catalog' and table_name like 'product_categor%' order by 1`,
    )

    expect(rows.map(r => r.table_name)).toEqual(['product_categories', 'product_category_links'])
  })

  it('[E6.1][ADR-021] a category cannot become its own ancestor', async () => {
    const store = randomUUID()
    const insert = (slug: string, parent: string | null) => pool.query<{ id: string }>(
      `insert into catalog.product_categories (store_id, name, slug, parent_id) values ($1, '{"en":"A"}', $2, $3) returning id`,
      [store, slug, parent],
    )
    const parent = (await insert(`a-${suffix()}`, null)).rows[0]!.id
    const child = (await insert(`b-${suffix()}`, parent)).rows[0]!.id

    const refused = await failure(pool.query(`update catalog.product_categories set parent_id = $1 where id = $2`, [child, parent]))

    expect(refused.constraint).toBe('product_categories_no_cycle')
  })
})

describe('[E6.1] migration 0010: products and SKUs', () => {
  it('[E6.1] a product starts as a draft with version 1 and a zero commission', async () => {
    const { rows } = await pool.query(`select status, row_version, commission_rate::float8 as rate from catalog.products where id = $1`, [await newProduct(randomUUID())])

    expect(rows[0]).toEqual({ status: 'draft', row_version: 1, rate: 0 })
  })

  it('[E6.1] a published product needs a slug and a name for each slug language', async () => {
    const store = randomUUID()
    const product = await newProduct(store)

    const noSlug = await failure(pool.query(`update catalog.products set status = 'published', published = '{"name":{"en":"A"}}' where id = $1`, [product]))
    const mismatch = await failure(pool.query(
      `update catalog.products set status = 'published', slug = '{"en":"a","de":"b"}', published = '{"name":{"en":"A"}}' where id = $1`,
      [product],
    ))

    expect(noSlug.constraint).toBe('products_published_fields_check')
    expect(mismatch.constraint).toBe('products_published_fields_check')
    await expect(pool.query(
      `update catalog.products set status = 'published', slug = $2::jsonb, published = '{"name":{"de":"A"}}' where id = $1`,
      [product, JSON.stringify({ de: `a-${suffix()}` })],
    )).resolves.toBeDefined()
  })

  it('[E6.1] a web address is unique for each language', async () => {
    const slug = `shared-${suffix()}`
    const store = randomUUID()
    const a = await newProduct(store)
    const b = await newProduct(store)
    await pool.query(`update catalog.products set slug = $2::jsonb where id = $1`, [a, JSON.stringify({ en: slug })])

    const refused = await failure(pool.query(`update catalog.products set slug = $2::jsonb where id = $1`, [b, JSON.stringify({ en: slug })]))

    expect(refused.constraint).toBe('products_slug_en_key')
  })

  it('[E6.1] the commission is between 0 and 1', async () => {
    const refused = await failure(pool.query(`update catalog.products set commission_rate = 1.5 where id = $1`, [await newProduct(randomUUID())]))

    expect(refused.constraint).toBe('products_commission_check')
  })

  it('[E6.1] a SKU code is letters and digits joined by - _ or .', async () => {
    const store = randomUUID()
    const product = await newProduct(store)

    const refused = await failure(pool.query(
      `insert into catalog.skus (store_id, sku_code, product_id, price_rappen) values ($1, 'bad code', $2, 100)`,
      [store, product],
    ))

    expect(refused.constraint).toBe('skus_sku_code_check')
  })

  it('[E6.1] a price is above zero', async () => {
    const store = randomUUID()
    const product = await newProduct(store)

    const refused = await failure(pool.query(
      `insert into catalog.skus (store_id, sku_code, product_id, price_rappen) values ($1, $2, $3, 0)`,
      [store, `P-${suffix()}`, product],
    ))

    expect(refused.constraint).toBe('skus_price_check')
  })

  it('[E6.1] a SKU code is unique in the shop', async () => {
    const store = randomUUID()
    const code = `U-${suffix()}`
    await newSku(store, await newProduct(store), code)

    const refused = await failure(newSku(store, await newProduct(store), code))

    expect(refused.constraint).toBe('skus_store_sku_code_key')
  })

  it('[E6.1] a product with no options has exactly one SKU, with the empty combination key', async () => {
    const store = randomUUID()
    const product = await newProduct(store)
    const sku = await newSku(store, product)

    const { rows } = await pool.query<{ combination_key: string }>(`select combination_key from catalog.skus where id = $1`, [sku])
    const second = await failure(newSku(store, product))

    expect(rows[0]?.combination_key).toBe('')
    expect(second.constraint).toBe('skus_combination_key')
  })

  it('[E6.1] a SKU of a product with an option needs a value of it at commit', async () => {
    const store = randomUUID()
    const product = await newProduct(store)
    await newOption(store, product, 1)

    const refused = await failure(newSku(store, product))

    expect(refused.constraint).toBe('skus_complete_options')
  })

  it('[E6.1] a value that a SKU uses cannot be deleted', async () => {
    const store = randomUUID()
    const product = await newProduct(store)
    const { option, value } = await newOption(store, product, 1)
    const client = await pool.connect()
    try {
      await client.query('begin')
      const sku = (await client.query<{ id: string }>(
        `insert into catalog.skus (store_id, sku_code, product_id, price_rappen) values ($1, $2, $3, 100) returning id`,
        [store, `V-${suffix()}`, product],
      )).rows[0]!.id
      await client.query(
        `insert into catalog.sku_option_values (sku_id, option_id, value_id, product_id, store_id) values ($1, $2, $3, $4, $5)`,
        [sku, option, value, product, store],
      )
      await client.query('commit')
    }
    finally {
      client.release()
    }

    const refused = await failure(pool.query(`delete from catalog.product_option_values where id = $1`, [value]))

    expect(refused.code).toBe('23001')
  })

  it('[E6.1] product photos keep a position and each file once', async () => {
    const store = randomUUID()
    const product = await newProduct(store)
    const media = randomUUID()
    await pool.query(`insert into catalog.product_media (product_id, store_id, position, media_id) values ($1, $2, 1, $3)`, [product, store, media])

    const sameFile = await failure(pool.query(`insert into catalog.product_media (product_id, store_id, position, media_id) values ($1, $2, 2, $3)`, [product, store, media]))
    const badPosition = await failure(pool.query(`insert into catalog.product_media (product_id, store_id, position, media_id) values ($1, $2, 0, $3)`, [product, store, randomUUID()]))

    expect(sameFile.constraint).toBe('product_media_media_key')
    expect(badPosition.constraint).toBe('product_media_position_check')
  })
})
