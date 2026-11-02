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

// A copy of api/migrations that stops after the migration with the tag that starts with `last`.
function folderThrough(last: string): string {
  const folder = mkdtempSync(join(tmpdir(), 'sk-migrations-'))
  folders.push(folder)
  cpSync(migrationsFolder, folder, { recursive: true })
  const journalPath = join(folder, 'meta', '_journal.json')
  const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as { entries: { idx: number, tag: string }[] }
  const stop = journal.entries.find(entry => entry.tag.startsWith(last))!.idx
  journal.entries = journal.entries.filter(entry => entry.idx <= stop)
  writeFileSync(journalPath, JSON.stringify(journal))
  return folder
}

afterAll(async () => {
  await Promise.allSettled(pools.map(pool => pool.end()))
  for (const folder of folders)
    rmSync(folder, { recursive: true, force: true })
  await Promise.allSettled(scratchDatabases.map(database => admin(`drop database if exists ${database} with (force)`)))
})

const insertPlace = `insert into content.places (store_id, status, first_published_at, slug, latitude, longitude, published)
  values ($1, 'published', now(), '{"en":"pier"}', 47.05, 8.3, '{"name":{"en":"Pier"}}') returning id`

describe('[T-016] migration 0020 lets a published pin be deleted', () => {
  it('[T-016][AC5] 0019 refuses to delete a published place, 0020 allows it, keeps the TRUNCATE guard and the fixed first_published_at, and runs twice', async () => {
    const database = `sk_test_${randomBytes(6).toString('hex')}`
    scratchDatabases.push(database)
    await admin(`create database ${database}`)
    const pool = new Pool({ connectionString: withDatabase(inject('databaseUrlUnpooled'), database), max: 1 })
    pools.push(pool)
    await migrate(drizzle({ client: pool }), { migrationsFolder: folderThrough('0019') })

    const store = randomUUID()
    const before = (await pool.query<{ id: string }>(insertPlace, [store])).rows[0]!.id
    await expect(pool.query('delete from content.places where id = $1', [before])).rejects.toMatchObject({ code: '23001', message: expect.stringContaining('cannot be deleted') })

    await migrate(drizzle({ client: pool }), { migrationsFolder })

    expect((await pool.query('delete from content.places where id = $1', [before])).rowCount).toBe(1)
    const after = (await pool.query<{ id: string }>(insertPlace.replace('{"en":"pier"}', '{"en":"quay"}'), [store])).rows[0]!.id
    await expect(pool.query(`update content.places set first_published_at = now() + interval '1 day' where id = $1`, [after])).rejects.toMatchObject({ code: '23001' })
    await expect(pool.query('truncate content.places cascade')).rejects.toThrow(/TRUNCATE on content.places is refused/)

    // Run the same file again: nothing changes and nothing fails.
    const sql = readFileSync(join(migrationsFolder, '0020_pin_delete_if_unused.sql'), 'utf8')
    for (const statement of sql.split('--> statement-breakpoint'))
      await pool.query(statement)
    expect((await pool.query('delete from content.places where id = $1', [after])).rowCount).toBe(1)
    // The story version guard of the same family is untouched.
    const triggers = await pool.query<{ name: string }>(`select tgname as name from pg_trigger where tgname in ('story_versions_keep_once_published', 'places_keep_once_published') and not tgisinternal`)
    expect(triggers.rows.map(row => row.name)).toEqual(['story_versions_keep_once_published'])
  })
})
