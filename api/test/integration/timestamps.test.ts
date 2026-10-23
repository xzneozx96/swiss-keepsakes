import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { eq } from 'drizzle-orm'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { guestProfiles, storeMemberships } from '../../src/modules/identity/adapters/schema.ts'
import { insertStore } from '../support/identity-wiring.ts'
import { openTestDatabase } from './support.ts'

vi.setConfig({ testTimeout: 60_000, hookTimeout: 120_000 })

const { pool, db } = openTestDatabase()
const longAgo = new Date('2020-01-01T00:00:00Z')

afterAll(async () => {
  await pool.end()
})

describe('[E2.3] migration 0006: created_at and updated_at on memberships and guest profiles', () => {
  it.each(['store_memberships', 'guest_profiles'])('[E2.3] %s has both columns as timestamptz, not null, default now()', async (table) => {
    const { rows } = await pool.query<{ column_name: string, data_type: string, is_nullable: string, column_default: string }>(
      `select column_name, data_type, is_nullable, column_default from information_schema.columns where table_schema = 'identity' and table_name = $1 and column_name in ('created_at', 'updated_at') order by column_name`,
      [table],
    )

    expect(rows).toEqual([
      { column_name: 'created_at', data_type: 'timestamp with time zone', is_nullable: 'NO', column_default: 'now()' },
      { column_name: 'updated_at', data_type: 'timestamp with time zone', is_nullable: 'NO', column_default: 'now()' },
    ])
  })

  it('[E2.3] a new membership and a new guest profile get both timestamps from the database', async () => {
    const storeId = randomUUID()
    await insertStore(pool, storeId)
    const [membership] = await db.insert(storeMemberships).values({ userId: randomUUID(), storeId, role: 'owner', acceptedAt: longAgo }).returning()
    const [profile] = await db.insert(guestProfiles).values({}).returning()

    for (const row of [membership, profile]) {
      expect(row!.createdAt.getTime()).toBeGreaterThan(longAgo.getTime())
      expect(row!.updatedAt.getTime()).toBeGreaterThan(longAgo.getTime())
    }
  })

  it('[E2.3] the migration backfills a membership row from accepted_at', async () => {
    const statements = readFileSync(new URL('../../migrations/0006_timestamps.sql', import.meta.url), 'utf8').split('--> statement-breakpoint').map(statement => statement.trim())
    const backfill = statements.find(statement => statement.startsWith('UPDATE'))
    const storeId = randomUUID()
    await insertStore(pool, storeId)
    const client = await pool.connect()
    try {
      await client.query('begin')
      const accepted = new Date('2026-03-04T05:06:07Z')
      const { rows } = await client.query<{ id: string }>(
        `insert into identity.store_memberships (user_id, store_id, role, accepted_at, created_at, updated_at) values ($1, $2, 'owner', $3, $4, $4) returning id`,
        [randomUUID(), storeId, accepted, new Date()],
      )
      await client.query(backfill!)
      const after = (await client.query<{ created_at: Date, updated_at: Date }>('select created_at, updated_at from identity.store_memberships where id = $1', [rows[0]!.id])).rows[0]!

      expect(after.created_at).toEqual(accepted)
      expect(after.updated_at).toEqual(accepted)
    }
    finally {
      await client.query('rollback')
      client.release()
    }
  })

  it('[E2.3] updating a membership moves updated_at and leaves created_at', async () => {
    const storeId = randomUUID()
    await insertStore(pool, storeId)
    const [row] = await db.insert(storeMemberships).values({ userId: randomUUID(), storeId, role: 'manager', acceptedAt: longAgo, createdAt: longAgo, updatedAt: longAgo }).returning()
    const [updated] = await db.update(storeMemberships).set({ role: 'owner' }).where(eq(storeMemberships.id, row!.id)).returning()

    expect(updated!.createdAt).toEqual(longAgo)
    expect(updated!.updatedAt.getTime()).toBeGreaterThan(longAgo.getTime())
  })

  it('[E2.3] updating a guest profile moves updated_at and leaves created_at', async () => {
    const [row] = await db.insert(guestProfiles).values({ createdAt: longAgo, updatedAt: longAgo }).returning()
    const [updated] = await db.update(guestProfiles).set({ authUserId: randomUUID() }).where(eq(guestProfiles.id, row!.id)).returning()

    expect(updated!.createdAt).toEqual(longAgo)
    expect(updated!.updatedAt.getTime()).toBeGreaterThan(longAgo.getTime())
  })
})
