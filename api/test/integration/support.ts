import type { Pool } from 'pg'
import { inject } from 'vitest'
import { createDatabase, createPool } from '../../src/platform/db/client.ts'
import { createLogger } from '../../src/platform/logger.ts'

export const silentLogger = createLogger('silent')

// The database global-setup.ts created for this run, through the pooled URL as request handlers use it.
export function openTestDatabase() {
  const pool = createPool(inject('databaseUrl'), silentLogger)
  return { pool, db: createDatabase(pool) }
}

export async function count(pool: Pool, text: string, values: unknown[] = []): Promise<number> {
  const { rows } = await pool.query<{ count: string }>(text, values)
  return Number(rows[0]?.count)
}
