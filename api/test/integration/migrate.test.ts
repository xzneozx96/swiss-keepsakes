import { readMigrationFiles } from 'drizzle-orm/migrator'
import { afterAll, describe, expect, inject, it } from 'vitest'
import { appliedMigrations, migrationsFolder, unknownMigrations } from '../../scripts/check-branch-migrations.ts'
import { migrateDatabase } from '../../src/platform/db/migrate.ts'
import { count, openTestDatabase, silentLogger } from './support.ts'

const { pool } = openTestDatabase()

afterAll(() => pool.end())

describe('[E1.9] migrations', () => {
  it('[E1.9] create the three platform tables and the pg-boss schema, and a second run changes nothing', async () => {
    const tables = () => pool.query<{ table_name: string }>(
      `select table_name from information_schema.tables where table_schema = 'platform' order by table_name`,
    )
    const applied = () => count(pool, 'select count(*) from drizzle.__drizzle_migrations')

    expect((await tables()).rows.map(row => row.table_name)).toEqual(['audit_log', 'idempotency_keys', 'webhook_events'])
    expect(await count(pool, `select count(*) from information_schema.tables where table_schema = 'pgboss' and table_name = 'job'`)).toBe(1)
    const before = await applied()

    await migrateDatabase(inject('databaseUrlUnpooled'), silentLogger)

    const files = readMigrationFiles({ migrationsFolder }).length
    expect(before).toBe(files)
    expect(await applied()).toBe(files)
  })
})

describe('[E1.13] the branch migration check', () => {
  it('[E1.13] finds every migration drizzle applied in api/migrations, and flags a row it does not have', async () => {
    const known = readMigrationFiles({ migrationsFolder })
    const rows = await appliedMigrations(pool)

    expect(rows.map(row => row.hash)).toEqual(known.map(migration => migration.hash))
    expect(unknownMigrations(rows, known)).toEqual([])
    expect(unknownMigrations(rows, known.slice(1))).toEqual(rows.slice(0, 1))
  })
})
