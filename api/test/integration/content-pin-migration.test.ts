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

interface Journal { entries: { idx: number }[] }

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

// A copy of api/migrations that stops after 0008.
function folderUpTo0008(): string {
  const folder = mkdtempSync(join(tmpdir(), 'sk-migrations-'))
  folders.push(folder)
  cpSync(migrationsFolder, folder, { recursive: true })
  const journalPath = join(folder, 'meta', '_journal.json')
  const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as Journal
  journal.entries = journal.entries.filter(entry => entry.idx <= 8)
  writeFileSync(journalPath, JSON.stringify(journal))
  return folder
}

async function runMigrations(pool: Pool, folder: string) {
  await migrate(drizzle({ client: pool }), { migrationsFolder: folder })
}

// A scratch database migrated to 0008, the shape the release before this one left behind.
async function databaseAt0008(): Promise<Pool> {
  const database = `sk_test_${randomBytes(6).toString('hex')}`
  scratchDatabases.push(database)
  await admin(`create database ${database}`)
  const pool = new Pool({ connectionString: withDatabase(inject('databaseUrlUnpooled'), database), max: 1 })
  pools.push(pool)
  await runMigrations(pool, folderUpTo0008())
  return pool
}

afterAll(async () => {
  await Promise.allSettled(pools.map(pool => pool.end()))
  for (const folder of folders)
    rmSync(folder, { recursive: true, force: true })
  await Promise.allSettled(scratchDatabases.map(database => admin(`drop database if exists ${database} with (force)`)))
})

async function insertId(pool: Pool, text: string, values: unknown[] = []): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(text, values)
  return rows[0]!.id
}

async function names(pool: Pool, text: string, values: unknown[] = []): Promise<string[]> {
  const { rows } = await pool.query<{ name: string }>(text, values)
  return rows.map(row => row.name).sort()
}

const droppedTriggers = ['story_versions_keep_pin_story', 'story_versions_keep_pin_story_on_delete', 'places_pin_has_published_story', 'places_type_is_immutable']
const keptTriggers = ['places_keep_once_published', 'story_versions_keep_once_published', 'story_versions_published_is_kept', 'places_first_published_is_fixed', 'places_no_truncate', 'story_versions_no_truncate']

const triggersSql = `select t.tgname as name from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'content' and c.relname in ('places', 'story_versions') and not t.tgisinternal`
const columnsSql = `select column_name as name from information_schema.columns where table_schema = 'content' and table_name = $1`

describe('[E2.11][AC68] the migration runs on top of 0008', () => {
  it('[E2.11][AC68] the migration runs on top of 0008, keeps the rows and drops the type and its rules', async () => {
    const pool = await databaseAt0008()
    const store = randomUUID()
    const group = await insertId(pool, `insert into content.story_groups (store_id, kind) values ($1, 'story') returning id`, [store])
    await pool.query(
      `insert into content.story_versions (group_id, language, store_id, status, slug, published, published_at)
       values ($1, 'en', $2, 'published', 'old-town', '{"title":"Old Town","body":{"type":"doc","content":[]}}', now())`,
      [group, store],
    )
    const place = await insertId(
      pool,
      `insert into content.places (store_id, type, status, first_published_at, slug, latitude, longitude, published, main_story_group_id)
       values ($1, 'sight', 'published', now(), '{"en":"old-town"}', 47.05, 8.3, '{"name":{"en":"Old Town"}}', $2) returning id`,
      [store, group],
    )
    const review = await insertId(
      pool,
      `insert into content.story_groups (store_id, kind, subject_place_id, subject_place_type) values ($1, 'editorial_review', $2, 'sight') returning id`,
      [store, place],
    )
    expect(await names(pool, triggersSql)).toEqual(expect.arrayContaining([...droppedTriggers, ...keptTriggers]))

    await runMigrations(pool, migrationsFolder)

    const present = async (table: string, id: string) =>
      (await pool.query(`select 1 from content.${table} where id = $1`, [id])).rowCount
    expect(await present('story_groups', group)).toBe(1)
    expect(await present('story_groups', review)).toBe(1)
    expect(await present('places', place)).toBe(1)
    expect((await pool.query(`select 1 from content.story_versions where group_id = $1 and status = 'published'`, [group])).rowCount).toBe(1)
    expect(await names(pool, columnsSql, ['places'])).not.toContain('type')
    expect(await names(pool, columnsSql, ['places'])).toEqual(expect.arrayContaining(['address', 'weekly_hours']))
    expect(await names(pool, columnsSql, ['story_groups'])).not.toContain('subject_place_type')
    expect(await names(pool, triggersSql)).toEqual(keptTriggers.sort())
    const named = await pool.query<{ subject_place_id: string }>('select subject_place_id from content.story_groups where id = $1', [review])
    expect(named.rows[0]?.subject_place_id).toBe(place)
  })

  it.each([
    ['an affiliate link with a network', 'affiliate', 'x', false],
    ['a direct link with a network', 'direct', 'x', false],
    ['a direct link with a disclosure', 'direct', null, true],
  ])('[E2.11][AC68] the migration refuses to run over a paid link and leaves it: %s', async (_what, kind, network, disclosure) => {
    const pool = await databaseAt0008()
    const store = randomUUID()
    const place = await insertId(pool, `insert into content.places (store_id, type) values ($1, 'accommodation') returning id`, [store])
    await pool.query(
      `insert into content.place_links (place_id, store_id, kind, network, disclosure, url) values ($1, $2, $3, $4, $5, 'https://example.com/')`,
      [place, store, kind, network, disclosure],
    )

    const refused = await runMigrations(pool, migrationsFolder).then(() => null, (error: Error & { cause?: Error }) => `${error.message} ${error.cause?.message ?? ''}`)

    expect(refused).toContain('0009_pin_model refuses to run')
    expect((await pool.query('select 1 from content.place_links where place_id = $1', [place])).rowCount).toBe(1)
    expect(await names(pool, columnsSql, ['places'])).toContain('type')
  })

  it('[E2.11][AC68] the migration runs over a plain link and keeps it', async () => {
    const pool = await databaseAt0008()
    const store = randomUUID()
    const place = await insertId(pool, `insert into content.places (store_id, type) values ($1, 'accommodation') returning id`, [store])
    await pool.query(
      `insert into content.place_links (place_id, store_id, kind, network, disclosure, url) values ($1, $2, 'direct', null, false, 'https://example.com/stay')`,
      [place, store],
    )

    await runMigrations(pool, migrationsFolder)

    const { rows } = await pool.query<{ url: string }>('select url from content.place_links where place_id = $1', [place])
    expect(rows.map(row => row.url)).toEqual(['https://example.com/stay'])
    expect(await names(pool, columnsSql, ['places'])).not.toContain('type')
  })
})
