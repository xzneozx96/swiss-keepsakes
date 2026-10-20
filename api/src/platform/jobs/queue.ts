import type { PgBoss } from 'pg-boss'
import type { Tx } from '../db/client.ts'
import { sql } from 'drizzle-orm'
import { fromDrizzle } from 'pg-boss'

export interface JobQueue<T> {
  // `id` (a UUID) lets the caller name the job, as the mail job does for its Message-ID.
  send: (tx: T, queue: string, data: object, options?: { startAfter?: Date, id?: string, retentionSeconds?: number, deleteAfterSeconds?: number }) => Promise<void>
}

// The job row is written through the caller's transaction, so a rollback removes it with the business
// change (D4, proven in docs/spikes/SP2.md). The queue must exist: pg-boss refuses a job for an unknown one.
export function createJobQueue(boss: PgBoss): JobQueue<Tx> {
  return {
    async send(tx, queue, data, options) {
      await boss.send(queue, data, { ...options, db: fromDrizzle(tx, sql) })
    },
  }
}
