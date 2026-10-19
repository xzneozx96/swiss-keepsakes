import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { Logger } from 'pino'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

export type Database = NodePgDatabase

// The handle `db.transaction` passes to its callback. Repositories, the audit log and the job queue take it.
export type Tx = Parameters<Parameters<Database['transaction']>[0]>[0]

export function createPool(connectionString: string, logger: Logger): Pool {
  // Without a timeout, a request waits forever for a connection when the database is unreachable.
  const pool = new Pool({ connectionString, connectionTimeoutMillis: 5_000 })
  // An idle client whose server goes away emits here, and an 'error' event with no listener ends the process.
  pool.on('error', error => logger.error({ err: error }, 'database pool error'))
  return pool
}

export function createDatabase(pool: Pool): Database {
  return drizzle({ client: pool })
}
