import type { Pool } from 'pg'
import { randomBytes, randomUUID } from 'node:crypto'
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Client, Pool as PgPool } from 'pg'
import { afterAll, describe, expect, inject, it, vi } from 'vitest'
import { migrationsFolder } from '../../scripts/check-branch-migrations.ts'

vi.setConfig({ testTimeout: 120_000, hookTimeout: 180_000 })

const scratchDatabases: string[] = []
const pools: Pool[] = []
const folders: string[] = []

function withDatabase(url: string, database: string): string {
  const parsed = new URL(url)
  parsed.pathname = `/${database}`
  return parsed.toString()
}

async function admin(statement: string) {
  const client = new Client({ connectionString: inject('databaseUrlUnpooled') })
  await client.connect()
  try {
    await client.query(statement)
  }
  finally {
    await client.end()
  }
}

// A copy of api/migrations that stops after 0016, the shape the release before this one left behind.
function folderUpTo0016(): string {
  const folder = mkdtempSync(join(tmpdir(), 'sk-migrations-'))
  folders.push(folder)
  cpSync(migrationsFolder, folder, { recursive: true })
  const journalPath = join(folder, 'meta', '_journal.json')
  const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as { entries: { idx: number }[] }
  journal.entries = journal.entries.filter(entry => entry.idx <= 16)
  writeFileSync(journalPath, JSON.stringify(journal))
  return folder
}

afterAll(async () => {
  await Promise.allSettled(pools.map(pool => pool.end()))
  for (const folder of folders)
    rmSync(folder, { recursive: true, force: true })
  await Promise.allSettled(scratchDatabases.map(database => admin(`drop database if exists ${database} with (force)`)))
})

async function id(pool: Pool, text: string, values: unknown[]): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(text, values)
  return rows[0]!.id
}

const draft = JSON.stringify({ name: { en: 'Knife' }, text: {}, media: [] })

describe('[T-010] migration 0017_keepsake_optional_sku_variant_photo', () => {
  it('[T-010] keeps every code, lets variants have no code, adds the photo column, drops the swatch and runs twice', async () => {
    const database = `sk_test_${randomBytes(6).toString('hex')}`
    scratchDatabases.push(database)
    await admin(`create database ${database}`)
    const pool = new PgPool({ connectionString: withDatabase(inject('databaseUrlUnpooled'), database), max: 1 })
    pools.push(pool)
    await migrate(drizzle({ client: pool }), { migrationsFolder: folderUpTo0016() })

    const store = randomUUID()
    const sku = async (code: string, productId?: string) => {
      const product = productId ?? await id(pool, `insert into catalog.products (store_id, draft) values ($1, $2::jsonb) returning id`, [store, draft])

      return id(pool, `insert into catalog.skus (store_id, sku_code, product_id, price_rappen, status) values ($1, $2, $3, 3900, 'published') returning id`, [store, code, product])
    }
    const keptA = await sku('VX-1')
    const keptB = await sku('VX-2.A')
    const withSwatch = await id(pool, `insert into catalog.products (store_id, draft) values ($1, $2::jsonb) returning id`, [store, draft])
    const option = await id(pool, `insert into catalog.product_options (store_id, product_id, name, position) values ($1, $2, '{"en":"Colour"}'::jsonb, 1) returning id`, [store, withSwatch])
    await pool.query(`insert into catalog.product_option_values (store_id, product_id, option_id, label, swatch, position) values ($1, $2, $3, '{"en":"Red"}'::jsonb, '#c8102e', 1)`, [store, withSwatch, option])
    // Before 0017 a SKU must have a code.
    await expect(pool.query(`insert into catalog.skus (store_id, sku_code, product_id, price_rappen, status) values ($1, null, $2, 100, 'published')`, [store, await id(pool, `insert into catalog.products (store_id, draft) values ($1, $2::jsonb) returning id`, [store, draft])])).rejects.toThrow(/null value/)

    await migrate(drizzle({ client: pool }), { migrationsFolder })

    const codes = async () => (await pool.query<{ id: string, sku_code: string | null }>(`select id, sku_code from catalog.skus where store_id = $1`, [store])).rows
    expect(new Map((await codes()).map(row => [row.id, row.sku_code]))).toEqual(new Map([[keptA, 'VX-1'], [keptB, 'VX-2.A']]))
    const columns = async (table: string) => (await pool.query<{ name: string }>(`select column_name as name from information_schema.columns where table_schema = 'catalog' and table_name = $1`, [table])).rows.map(row => row.name)
    expect(await columns('skus')).toContain('media_id')
    expect(await columns('product_option_values')).not.toContain('swatch')
    expect((await pool.query(`select 1 from pg_constraint where conname = 'product_option_values_swatch_check'`)).rowCount).toBe(0)

    // Any number of variants of a shop may have no code; a present code stays unique per shop and still has to look like one.
    const noneA = await id(pool, `insert into catalog.skus (store_id, sku_code, media_id, product_id, price_rappen, status) values ($1, null, $2, $3, 100, 'published') returning id`, [store, randomUUID(), await id(pool, `insert into catalog.products (store_id, draft) values ($1, $2::jsonb) returning id`, [store, draft])])
    const noneB = await id(pool, `insert into catalog.skus (store_id, sku_code, product_id, price_rappen, status) values ($1, null, $2, 100, 'published') returning id`, [store, await id(pool, `insert into catalog.products (store_id, draft) values ($1, $2::jsonb) returning id`, [store, draft])])
    expect(noneA).not.toBe(noneB)
    await expect(sku('VX-1')).rejects.toThrow(/skus_store_sku_code_key/)
    await expect(sku('not a code')).rejects.toThrow(/skus_sku_code_check/)

    // Running the file's statements again changes nothing and fails nowhere.
    const statements = readFileSync(join(migrationsFolder, '0017_keepsake_optional_sku_variant_photo.sql'), 'utf8').split('--> statement-breakpoint')
    for (const statement of statements)
      await pool.query(statement)
    expect((await codes()).filter(row => row.sku_code !== null)).toHaveLength(2)
    expect(await columns('skus')).toContain('media_id')
  })
})
