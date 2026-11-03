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

const overnight = '[{"day":5,"opens":"18:00","closes":"02:00"}]'
const insertPlace = `insert into content.places (store_id, weekly_hours) values ($1, $2::jsonb)`

describe('[T-013] migration 0019 lets opening hours cross midnight', () => {
  it('[T-013] refuses an overnight span at 0018, accepts it at 0019, keeps the rest of the rule and runs twice', async () => {
    const database = `sk_test_${randomBytes(6).toString('hex')}`
    scratchDatabases.push(database)
    await admin(`create database ${database}`)
    const pool = new Pool({ connectionString: withDatabase(inject('databaseUrlUnpooled'), database), max: 1 })
    pools.push(pool)
    await migrate(drizzle({ client: pool }), { migrationsFolder: folderUpTo(18) })

    const store = randomUUID()
    await pool.query(insertPlace, [store, '[{"day":1,"opens":"09:00","closes":"18:00"}]'])
    await expect(pool.query(insertPlace, [store, overnight])).rejects.toMatchObject({ constraint: 'places_weekly_hours_check' })

    await migrate(drizzle({ client: pool }), { migrationsFolder })

    const ok = async (value: string) => (await pool.query<{ ok: boolean }>('select content.valid_weekly_hours($1::jsonb) as ok', [value])).rows[0]!.ok
    await pool.query(insertPlace, [store, overnight])
    expect(await ok('[{"day":7,"opens":"22:00","closes":"00:00"}]')).toBe(true)
    expect(await ok('[{"day":1,"opens":"00:00","closes":"24:00"}]')).toBe(true)
    // The same day may hold an overnight span and the next day's own first span: overlaps were never checked.
    expect(await ok('[{"day":5,"opens":"18:00","closes":"02:00"},{"day":6,"opens":"01:00","closes":"05:00"}]')).toBe(true)
    // Equal times are ambiguous; the shape rules stay.
    expect(await ok('[{"day":1,"opens":"08:00","closes":"08:00"}]')).toBe(false)
    expect(await ok('[{"day":1,"opens":"00:00","closes":"00:00"}]')).toBe(false)
    expect(await ok('[{"day":8,"opens":"18:00","closes":"02:00"}]')).toBe(false)
    expect(await ok('[{"day":1,"opens":"24:00","closes":"02:00"}]')).toBe(false)
    expect(await ok('[{"day":1,"opens":"18:00","closes":"02:00","note":"x"}]')).toBe(false)
    expect(await ok('{}')).toBe(false)
    await expect(pool.query(insertPlace, [store, '[{"day":1,"opens":"08:00","closes":"08:00"}]'])).rejects.toMatchObject({ constraint: 'places_weekly_hours_check' })

    // Run the same file again: nothing changes and nothing fails.
    const sql = readFileSync(join(migrationsFolder, '0019_weekly_hours_cross_midnight.sql'), 'utf8')
    for (const statement of sql.split('--> statement-breakpoint'))
      await pool.query(statement)
    expect(await ok(overnight)).toBe(true)
    expect((await pool.query(`select 1 from content.places where store_id = $1`, [store])).rowCount).toBe(2)
  })
})
