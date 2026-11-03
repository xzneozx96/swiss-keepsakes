import { randomBytes, randomUUID } from 'node:crypto'
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Client, Pool } from 'pg'
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

// A copy of api/migrations that stops after migration `last`.
function folderUpTo(last: number): string {
  const folder = mkdtempSync(join(tmpdir(), 'sk-migrations-'))
  folders.push(folder)
  cpSync(migrationsFolder, folder, { recursive: true })
  const journalPath = join(folder, 'meta', '_journal.json')
  const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as { entries: { idx: number }[] }
  journal.entries = journal.entries.filter(entry => entry.idx <= last)
  writeFileSync(journalPath, JSON.stringify(journal))
  return folder
}

afterAll(async () => {
  await Promise.allSettled(pools.map(pool => pool.end()))
  for (const folder of folders)
    rmSync(folder, { recursive: true, force: true })
  await Promise.allSettled(scratchDatabases.map(database => admin(`drop database if exists ${database} with (force)`)))
})

const tablesQuery = `select table_name from information_schema.tables where table_schema = 'catalog' and table_name like 'pickup_place%' order by table_name`
const link = 'https://maps.app.goo.gl/AbCdEf123'
const insertPlace = `insert into catalog.pickup_places (store_id, name, address, instructions, maps_link, latitude, longitude) values ($1, $2::jsonb, $3::jsonb, $4::jsonb, '${link}', 47.0507, 8.3068) returning id`
const insertHours = `insert into catalog.pickup_place_hours (place_id, store_id, weekday, opens, closes) values ($1, $2, $3, $4, $5)`

describe('[E6.6][AC26] migration 0022 adds the pickup points', () => {
  it('[E6.6][AC26] creates both tables, keeps the store scope and the span rules, and runs twice', async () => {
    const database = `sk_test_${randomBytes(6).toString('hex')}`
    scratchDatabases.push(database)
    await admin(`create database ${database}`)
    const pool = new Pool({ connectionString: withDatabase(inject('databaseUrlUnpooled'), database), max: 1 })
    pools.push(pool)
    await migrate(drizzle({ client: pool }), { migrationsFolder: folderUpTo(20) })
    expect((await pool.query(tablesQuery)).rows).toEqual([])

    await migrate(drizzle({ client: pool }), { migrationsFolder })
    expect((await pool.query(tablesQuery)).rows.map(row => row.table_name)).toEqual(['pickup_place_hours', 'pickup_places'])

    const storeA = randomUUID()
    const storeB = randomUUID()
    const name = '{"en":"Shop"}'
    const address = '{"de":"Hertensteinstrasse 1"}'
    const place = (await pool.query<{ id: string }>(insertPlace, [storeA, name, address, null])).rows[0]!.id
    const row = (await pool.query(`select position, archived_at, row_version from catalog.pickup_places where id = $1`, [place])).rows[0]
    expect(row).toEqual({ position: 1, archived_at: null, row_version: 1 })

    // A span may cross midnight; two spans may share a day; 24:00 closes at midnight and reads back as 24:00:00.
    await pool.query(insertHours, [place, storeA, 5, '22:00', '02:00'])
    await pool.query(insertHours, [place, storeA, 5, '09:00', '12:00'])
    await pool.query(insertHours, [place, storeA, 6, '22:00', '24:00'])
    const closes = await pool.query<{ closes: string }>(`select closes::text as closes from catalog.pickup_place_hours where weekday = 6`)
    expect(closes.rows[0]!.closes).toBe('24:00:00')

    await expect(pool.query(insertHours, [place, storeA, 1, '10:00', '10:00'])).rejects.toMatchObject({ constraint: 'pickup_place_hours_span_check' })
    await expect(pool.query(insertHours, [place, storeA, 8, '10:00', '18:00'])).rejects.toMatchObject({ constraint: 'pickup_place_hours_weekday_check' })
    await expect(pool.query(insertHours, [place, storeA, 5, '22:00', '23:00'])).rejects.toMatchObject({ constraint: 'pickup_place_hours_pkey' })
    await expect(pool.query(insertHours, [place, storeB, 1, '10:00', '18:00'])).rejects.toMatchObject({ constraint: 'pickup_place_hours_place_fkey' })
    await expect(pool.query(insertPlace, [storeA, '{}', address, null])).rejects.toMatchObject({ constraint: 'pickup_places_name_check' })
    await expect(pool.query(insertPlace, [storeA, name, '{}', null])).rejects.toMatchObject({ constraint: 'pickup_places_address_check' })

    // Deleting the place removes its hours.
    await pool.query(`delete from catalog.pickup_places where id = $1`, [place])
    expect((await pool.query(`select 1 from catalog.pickup_place_hours`)).rowCount).toBe(0)

    // A second migrate is a no-op.
    await migrate(drizzle({ client: pool }), { migrationsFolder })
    expect((await pool.query(tablesQuery)).rowCount).toBe(2)
  })

  it('[E6.6][AC26] has the active-list index', async () => {
    const database = `sk_test_${randomBytes(6).toString('hex')}`
    scratchDatabases.push(database)
    await admin(`create database ${database}`)
    const pool = new Pool({ connectionString: withDatabase(inject('databaseUrlUnpooled'), database), max: 1 })
    pools.push(pool)
    await migrate(drizzle({ client: pool }), { migrationsFolder })
    const index = await pool.query<{ indexdef: string }>(`select indexdef from pg_indexes where schemaname = 'catalog' and indexname = 'pickup_places_active_idx'`)
    expect(index.rows[0]!.indexdef).toContain('WHERE (archived_at IS NULL)')
  })
})

const withMaps = `insert into catalog.pickup_places (store_id, name, address, maps_link, latitude, longitude) values ($1, '{"en":"Shop"}'::jsonb, '{"en":"Street 1"}'::jsonb, $2, $3, $4)`

async function scratchPool(last?: number) {
  const database = `sk_test_${randomBytes(6).toString('hex')}`
  scratchDatabases.push(database)
  await admin(`create database ${database}`)
  const pool = new Pool({ connectionString: withDatabase(inject('databaseUrlUnpooled'), database), max: 1 })
  pools.push(pool)
  if (last !== undefined)
    await migrate(drizzle({ client: pool }), { migrationsFolder: folderUpTo(last) })
  return pool
}

describe('[S8-PICKUP-MAPS] migration 0025 gives every pickup point a Google Maps link and a pin', () => {
  it('[S8-PICKUP-MAPS] adds three required columns with the places checks', async () => {
    const pool = await scratchPool()
    await migrate(drizzle({ client: pool }), { migrationsFolder })
    const columns = await pool.query<{ column_name: string, is_nullable: string, data_type: string }>(
      `select column_name, is_nullable, data_type from information_schema.columns where table_schema = 'catalog' and table_name = 'pickup_places' and column_name in ('maps_link', 'latitude', 'longitude') order by column_name`,
    )
    expect(columns.rows).toEqual([
      { column_name: 'latitude', is_nullable: 'NO', data_type: 'double precision' },
      { column_name: 'longitude', is_nullable: 'NO', data_type: 'double precision' },
      { column_name: 'maps_link', is_nullable: 'NO', data_type: 'text' },
    ])

    const store = randomUUID()
    await pool.query(withMaps, [store, link, 47.0507, 8.3068])
    await expect(pool.query(withMaps, [store, null, 47.0507, 8.3068])).rejects.toMatchObject({ code: '23502', column: 'maps_link' })
    await expect(pool.query(withMaps, [store, link, null, 8.3068])).rejects.toMatchObject({ code: '23502', column: 'latitude' })
    await expect(pool.query(withMaps, [store, link, 47.0507, null])).rejects.toMatchObject({ code: '23502', column: 'longitude' })
    await expect(pool.query(withMaps, [store, 'http://maps.app.goo.gl/x', 47, 8])).rejects.toMatchObject({ constraint: 'pickup_places_maps_link_check' })
    await expect(pool.query(withMaps, [store, 'https://maps.app.goo.gl/a b', 47, 8])).rejects.toMatchObject({ constraint: 'pickup_places_maps_link_check' })
    await expect(pool.query(withMaps, [store, `https://maps.app.goo.gl/${'a'.repeat(2000)}`, 47, 8])).rejects.toMatchObject({ constraint: 'pickup_places_maps_link_check' })
    await expect(pool.query(withMaps, [store, link, 90.5, 8])).rejects.toMatchObject({ constraint: 'pickup_places_latitude_check' })
    await expect(pool.query(withMaps, [store, link, -91, 8])).rejects.toMatchObject({ constraint: 'pickup_places_latitude_check' })
    await expect(pool.query(withMaps, [store, link, 47, 180.5])).rejects.toMatchObject({ constraint: 'pickup_places_longitude_check' })
    await expect(pool.query(withMaps, [store, link, 47, -181])).rejects.toMatchObject({ constraint: 'pickup_places_longitude_check' })
    await pool.query(withMaps, [store, link, -90, 180])
  })

  it('[S8-PICKUP-MAPS] on a database that already holds a point it fails loudly and changes nothing, so no value is invented', async () => {
    const pool = await scratchPool(24)
    await pool.query(`insert into catalog.pickup_places (store_id, name, address) values ($1, '{"en":"Shop"}'::jsonb, '{"en":"Street 1"}'::jsonb)`, [randomUUID()])

    await expect(migrate(drizzle({ client: pool }), { migrationsFolder })).rejects.toThrow()

    const columns = await pool.query(`select 1 from information_schema.columns where table_schema = 'catalog' and table_name = 'pickup_places' and column_name = 'maps_link'`)
    expect(columns.rowCount).toBe(0)
    expect((await pool.query(`select 1 from catalog.pickup_places`)).rowCount).toBe(1)
  })

  it('[S8-PICKUP-MAPS] on an empty table it applies, and a second run is a no-op', async () => {
    const pool = await scratchPool(24)
    await migrate(drizzle({ client: pool }), { migrationsFolder })
    await migrate(drizzle({ client: pool }), { migrationsFolder })
    expect((await pool.query(`select 1 from information_schema.columns where table_schema = 'catalog' and table_name = 'pickup_places' and column_name = 'maps_link'`)).rowCount).toBe(1)
  })
})
