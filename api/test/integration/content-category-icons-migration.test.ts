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

// A copy of api/migrations that stops after 0015, the shape the release before this one left behind.
function folderUpTo0015(): string {
  const folder = mkdtempSync(join(tmpdir(), 'sk-migrations-'))
  folders.push(folder)
  cpSync(migrationsFolder, folder, { recursive: true })
  const journalPath = join(folder, 'meta', '_journal.json')
  const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as { entries: { idx: number }[] }
  journal.entries = journal.entries.filter(entry => entry.idx <= 15)
  writeFileSync(journalPath, JSON.stringify(journal))
  return folder
}

async function databaseAt0015(): Promise<Pool> {
  const database = `sk_test_${randomBytes(6).toString('hex')}`
  scratchDatabases.push(database)
  await admin(`create database ${database}`)
  const pool = new PgPool({ connectionString: withDatabase(inject('databaseUrlUnpooled'), database), max: 1 })
  pools.push(pool)
  await migrate(drizzle({ client: pool }), { migrationsFolder: folderUpTo0015() })
  return pool
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

function category(pool: Pool, store: string, slug: string, en: string, de: string | null, parent: string | null = null) {
  return id(pool, `insert into content.map_categories (store_id, name, slug, parent_id) values ($1, $2::jsonb, $3, $4) returning id`, [store, JSON.stringify(de ? { en, de } : { en }), slug, parent])
}

function place(pool: Pool, store: string, service: string | null, food: string | null) {
  return id(pool, `insert into content.places (store_id, service_type, food_kind) values ($1, $2, $3) returning id`, [store, service, food])
}

function link(pool: Pool, store: string, placeId: string, categoryId: string) {
  return pool.query(`insert into content.place_categories (place_id, category_id, store_id) values ($1, $2, $3)`, [placeId, categoryId, store])
}

async function iconsOf(pool: Pool, placeId: string): Promise<string[]> {
  const { rows } = await pool.query<{ icon: string | null }>(
    `select coalesce(c.icon, par.icon) as icon from content.place_categories pc
       join content.map_categories c on c.id = pc.category_id
       left join content.map_categories par on par.id = c.parent_id
      where pc.place_id = $1 order by 1`,
    [placeId],
  )
  return rows.map(row => row.icon).filter((icon): icon is string => icon !== null)
}

async function columns(pool: Pool, table: string) {
  return (await pool.query<{ name: string }>(`select column_name as name from information_schema.columns where table_schema = 'content' and table_name = $1`, [table])).rows.map(row => row.name)
}

describe('[T-009b][AC3] migration 0016 moves the place service and food kind into category icons', () => {
  it('[T-009b][AC3] links the pins to categories with the icon, creates the missing ones, drops the columns and runs twice', async () => {
    const pool = await databaseAt0015()
    const store = randomUUID()
    const other = randomUUID()
    const free = await category(pool, store, 'free-essentials', 'Free essentials', 'Gratis und praktisch')
    const toilets = await category(pool, store, 'toilets', 'Toilets', 'Toiletten', free)
    const markets = await category(pool, store, 'markets', 'Markets', null)
    const sights = await category(pool, store, 'sights', 'Sights', 'Sehenswürdigkeiten')

    const wc = await place(pool, store, 'toilets', null)
    const wcLinked = await place(pool, store, 'toilets', null)
    await link(pool, store, wcLinked, toilets)
    const fountain = await place(pool, store, 'water', null)
    const stalls = await place(pool, store, null, 'market')
    const both = await place(pool, store, 'transport', 'restaurant')
    await link(pool, store, both, sights)
    const plain = await place(pool, store, null, null)
    const cash = await place(pool, other, 'cash', null)

    const before = (await pool.query<{ service: string, food: string }>(`select count(service_type)::text as service, count(food_kind)::text as food from content.places`)).rows[0]
    expect(before).toEqual({ service: '5', food: '2' })
    const categoriesBefore = Number((await pool.query<{ n: string }>(`select count(*) as n from content.map_categories`)).rows[0]!.n)

    await migrate(drizzle({ client: pool }), { migrationsFolder })

    expect(await columns(pool, 'places')).not.toEqual(expect.arrayContaining(['service_type']))
    expect(await columns(pool, 'places')).not.toEqual(expect.arrayContaining(['food_kind']))
    expect(await columns(pool, 'map_categories')).toEqual(expect.arrayContaining(['icon', 'show_on_home']))
    expect(Number((await pool.query<{ n: string }>(`select count(*) as n from content.places`)).rows[0]!.n)).toBe(7)

    const rowOf = async (categoryId: string) => (await pool.query<{ icon: string | null, show_on_home: boolean }>(`select icon, show_on_home from content.map_categories where id = $1`, [categoryId])).rows[0]!
    // A category named like the value takes its icon (a service also the home switch); one that is no match stays plain.
    expect(await rowOf(toilets)).toEqual({ icon: 'toilet', show_on_home: true })
    expect(await rowOf(markets)).toEqual({ icon: 'market', show_on_home: false })
    expect(await rowOf(sights)).toEqual({ icon: null, show_on_home: false })
    expect(await rowOf(free)).toEqual({ icon: null, show_on_home: false })

    expect(await iconsOf(pool, wc)).toEqual(['toilet'])
    expect(await iconsOf(pool, wcLinked)).toEqual(['toilet'])
    expect((await pool.query(`select 1 from content.place_categories where place_id = $1`, [wcLinked])).rowCount).toBe(1)
    expect(await iconsOf(pool, fountain)).toEqual(['water'])
    expect(await iconsOf(pool, stalls)).toEqual(['market'])
    expect(await iconsOf(pool, both)).toEqual(['restaurant', 'transport'])
    expect(await iconsOf(pool, plain)).toEqual([])
    expect(await iconsOf(pool, cash)).toEqual(['cash'])

    // No match in the store: a top-level category named after the value, in both languages.
    const created = await pool.query<{ slug: string, name: { en: string, de: string }, parent_id: string | null, position: number, store_id: string, icon: string, show_on_home: boolean }>(
      `select slug, name, parent_id, position, store_id, icon, show_on_home from content.map_categories where icon in ('water', 'transport', 'restaurant', 'cash') order by slug`,
    )
    expect(created.rows.map(row => [row.slug, row.name, row.parent_id, row.store_id === store ? 'store' : 'other', row.icon, row.show_on_home])).toEqual([
      ['cash', { en: 'Cash machines', de: 'Geldautomaten' }, null, 'other', 'cash', true],
      ['restaurant', { en: 'Restaurants', de: 'Restaurants' }, null, 'store', 'restaurant', false],
      ['transport', { en: 'Public transport', de: 'Öffentlicher Verkehr' }, null, 'store', 'transport', true],
      ['water', { en: 'Drinking water', de: 'Trinkwasser' }, null, 'store', 'water', true],
    ])
    expect(created.rows.find(row => row.slug === 'cash')!.position).toBe(1)
    expect(Number((await pool.query<{ n: string }>(`select count(*) as n from content.map_categories`)).rows[0]!.n)).toBe(categoriesBefore + 4)

    // The rule of the database: only the fixed icons.
    await expect(pool.query(`update content.map_categories set icon = 'toilets' where id = $1`, [markets])).rejects.toMatchObject({ constraint: 'map_categories_icon_check' })

    // Run the same file again: nothing changes and nothing fails.
    const sql = readFileSync(join(migrationsFolder, '0016_map_category_icons.sql'), 'utf8')
    const counts = async () => (await pool.query(`select (select count(*) from content.map_categories) as c, (select count(*) from content.place_categories) as l`)).rows[0]
    const snapshot = await counts()
    for (const statement of sql.split('--> statement-breakpoint'))
      await pool.query(statement)
    expect(await counts()).toEqual(snapshot)
  })
})
