import { afterAll, describe, expect, inject, it } from 'vitest'
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

    expect(before).toBe(1)
    expect(await applied()).toBe(1)
  })
})
