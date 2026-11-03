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
import { openTestDatabase } from './support.ts'

vi.setConfig({ testTimeout: 120_000, hookTimeout: 180_000 })

const { pool } = openTestDatabase()
const scratchDatabases: string[] = []
const scratchPools: Pool[] = []
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

// A copy of api/migrations that stops after 0020, the shape the release before this one left behind.
function folderUpTo0020(): string {
  const folder = mkdtempSync(join(tmpdir(), 'sk-migrations-'))
  folders.push(folder)
  cpSync(migrationsFolder, folder, { recursive: true })
  const journalPath = join(folder, 'meta', '_journal.json')
  const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as { entries: { idx: number }[] }
  journal.entries = journal.entries.filter(entry => entry.idx <= 20)
  writeFileSync(journalPath, JSON.stringify(journal))
  return folder
}

afterAll(async () => {
  await Promise.allSettled([pool.end(), ...scratchPools.map(scratch => scratch.end())])
  for (const folder of folders)
    rmSync(folder, { recursive: true, force: true })
  await Promise.allSettled(scratchDatabases.map(database => admin(`drop database if exists ${database} with (force)`)))
})

async function stock(onHand: number): Promise<{ store: string, sku: string }> {
  const store = randomUUID()
  const sku = randomUUID()
  await pool.query(`insert into inventory.stock_items (sku_id, store_id, on_hand) values ($1, $2, $3)`, [sku, store, onHand])

  return { store, sku }
}

async function hold(store: string, sku: string, quantity: number, client: Pick<Pool, 'query'> = pool): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    `insert into inventory.stock_holds (store_id, sku_id, order_id, order_line_id, quantity) values ($1, $2, $3, $4, $5) returning id`,
    [store, sku, randomUUID(), randomUUID(), quantity],
  )

  return rows[0]!.id
}

async function item(sku: string) {
  const { rows } = await pool.query<{ on_hand: number, held: number }>(`select on_hand, held from inventory.stock_items where sku_id = $1`, [sku])

  return rows[0]!
}

describe('[E6.3][AC05][AC53] migration 0021_inventory', () => {
  it('[E6.3][AC05][AC53] AC-1: two connections holding the last unit at the same time store exactly one hold', async () => {
    const { store, sku } = await stock(1)
    const first = await pool.connect()
    const second = await pool.connect()
    try {
      await first.query('begin')
      await second.query('begin')
      await hold(store, sku, 1, first)
      // The second insert waits on the stock row lock the first one holds, so both are in flight together.
      const waiting = hold(store, sku, 1, second).then(() => 'stored', (error: { constraint?: string }) => error.constraint)
      await new Promise(resolve => setTimeout(resolve, 300))
      await first.query('commit')
      expect(await waiting).toBe('stock_items_held_within_on_hand')
      await second.query('rollback')
    }
    finally {
      first.release()
      second.release()
    }

    expect(await item(sku)).toEqual({ on_hand: 1, held: 1 })
    expect((await pool.query(`select 1 from inventory.stock_holds where sku_id = $1`, [sku])).rowCount).toBe(1)
  })

  it('[E6.3][AC05][AC53] AC-1: 3 in stock, a hold of 2, then a second hold of 2 is refused and held stays 2', async () => {
    const { store, sku } = await stock(3)
    await hold(store, sku, 2)
    await expect(hold(store, sku, 2)).rejects.toMatchObject({ constraint: 'stock_items_held_within_on_hand' })
    expect(await item(sku)).toEqual({ on_hand: 3, held: 2 })
    await hold(store, sku, 1)
    expect(await item(sku)).toEqual({ on_hand: 3, held: 3 })
  })

  it('[E6.3][AC05][AC53] AC-3: held cannot be written directly, on_hand can', async () => {
    const { sku } = await stock(5)
    await expect(pool.query(`update inventory.stock_items set held = 1 where sku_id = $1`, [sku])).rejects.toThrow(/maintained by a trigger/)
    await pool.query(`update inventory.stock_items set on_hand = 7 where sku_id = $1`, [sku])
    expect(await item(sku)).toEqual({ on_hand: 7, held: 0 })
    await expect(pool.query(`update inventory.stock_items set on_hand = 0, held = 0 where sku_id = $1`, [sku])).resolves.toBeDefined()
  })

  it('[E6.3][AC05][AC53] AC-5: an adjustment is never changed or deleted, and a set needs an actor', async () => {
    const { store, sku } = await stock(0)
    const actor = randomUUID()
    const { rows } = await pool.query<{ id: string }>(
      `insert into inventory.stock_adjustments (store_id, sku_id, kind, delta, on_hand_before, on_hand_after, actor_user_id) values ($1, $2, 'set', 4, 0, 4, $3) returning id`,
      [store, sku, actor],
    )
    const id = rows[0]!.id
    await expect(pool.query(`update inventory.stock_adjustments set reason = 'x' where id = $1`, [id])).rejects.toThrow()
    await expect(pool.query(`delete from inventory.stock_adjustments where id = $1`, [id])).rejects.toThrow()
    await expect(pool.query(
      `insert into inventory.stock_adjustments (store_id, sku_id, kind, delta, on_hand_before, on_hand_after) values ($1, $2, 'set', 1, 4, 5)`,
      [store, sku],
    )).rejects.toMatchObject({ constraint: 'stock_adjustments_who_check' })
    expect((await pool.query(`select 1 from inventory.stock_adjustments where id = $1`, [id])).rowCount).toBe(1)
  })

  it('[E6.3][AC05][AC53] AC-5: holds are never deleted; an issued hold moves on_hand and writes an issue adjustment; a release frees held', async () => {
    const { store, sku } = await stock(5)
    const issued = await hold(store, sku, 2)
    const released = await hold(store, sku, 1)
    await expect(pool.query(`delete from inventory.stock_holds where id = $1`, [issued])).rejects.toThrow()

    await pool.query(`update inventory.stock_holds set state = 'released', resolved_at = now() where id = $1`, [released])
    expect(await item(sku)).toEqual({ on_hand: 5, held: 2 })
    await pool.query(`update inventory.stock_holds set state = 'issued', resolved_at = now() where id = $1`, [issued])
    expect(await item(sku)).toEqual({ on_hand: 3, held: 0 })

    const { rows } = await pool.query<{ kind: string, delta: number, on_hand_before: number, on_hand_after: number, order_id: string | null }>(
      `select kind, delta, on_hand_before, on_hand_after, order_id from inventory.stock_adjustments where sku_id = $1`,
      [sku],
    )
    expect(rows).toEqual([{ kind: 'issue', delta: -2, on_hand_before: 5, on_hand_after: 3, order_id: expect.any(String) }])
    await expect(pool.query(`update inventory.stock_holds set state = 'released', resolved_at = now() where id = $1`, [issued])).rejects.toThrow(/resolved hold/)
    await expect(pool.query(`delete from inventory.stock_holds where id = $1`, [released])).rejects.toThrow()
  })

  it('[E6.3][AC05][AC53] AC-9: back-fills one empty stock row per SKU, archived included, writes no history, and runs twice', async () => {
    const database = `sk_test_${randomBytes(6).toString('hex')}`
    scratchDatabases.push(database)
    await admin(`create database ${database}`)
    const scratch = new PgPool({ connectionString: withDatabase(inject('databaseUrlUnpooled'), database), max: 1 })
    scratchPools.push(scratch)
    await migrate(drizzle({ client: scratch }), { migrationsFolder: folderUpTo0020() })

    const draft = JSON.stringify({ name: { en: 'Knife' }, text: {}, media: [] })
    const storeA = randomUUID()
    const storeB = randomUUID()
    const skus: string[] = []
    for (const [store, code, status] of [[storeA, 'IN-1', 'published'], [storeA, 'IN-2', 'archived'], [storeB, 'IN-3', 'draft'], [storeB, null, 'published']] as const) {
      const product = (await scratch.query<{ id: string }>(`insert into catalog.products (store_id, draft) values ($1, $2::jsonb) returning id`, [store, draft])).rows[0]!.id
      skus.push((await scratch.query<{ id: string }>(
        `insert into catalog.skus (store_id, sku_code, product_id, price_rappen, status) values ($1, $2, $3, 3900, $4) returning id`,
        [store, code, product, status],
      )).rows[0]!.id)
    }
    expect(skus).toHaveLength(4)

    await migrate(drizzle({ client: scratch }), { migrationsFolder })

    const rows = async () => (await scratch.query<{ sku_id: string, store_id: string, on_hand: number, held: number }>(
      `select sku_id, store_id, on_hand, held from inventory.stock_items order by sku_id`,
    )).rows
    const filled = await rows()
    expect(filled.map(row => row.sku_id).sort()).toEqual([...skus].sort())
    expect(filled.every(row => row.on_hand === 0 && row.held === 0)).toBe(true)
    expect((await scratch.query(`select count(*)::int as n from inventory.stock_adjustments`)).rows[0]).toEqual({ n: 0 })

    // The back-fill statement again, with one row already counted: nothing is added or changed.
    await scratch.query(`update inventory.stock_items set on_hand = 9 where sku_id = $1`, [skus[0]])
    const statement = readFileSync(join(migrationsFolder, '0021_inventory.sql'), 'utf8').split('--> statement-breakpoint').find(part => /INSERT INTO inventory\.stock_items/i.test(part))
    expect(statement).toBeDefined()
    await scratch.query(statement!)
    await scratch.query(statement!)
    const again = await rows()
    expect(again).toHaveLength(4)
    expect(again.find(row => row.sku_id === skus[0])!.on_hand).toBe(9)
    expect((await scratch.query(`select count(*)::int as n from inventory.stock_adjustments`)).rows[0]).toEqual({ n: 0 })
  })
})
