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

// A client address no other call of this run has, for the `Fly-Client-IP` header: Better Auth limits the sign-in routes per address
// (3 sign-in codes a minute), so two calls must never share one. The second octet is random per process (parallel files run in
// separate processes), the last two count up.
const processOctet = 64 + Math.floor(Math.random() * 64)
let calls = 0
export function uniqueIp(): string {
  calls += 1
  return `100.${processOctet}.${Math.floor(calls / 256) % 256}.${calls % 256}`
}
