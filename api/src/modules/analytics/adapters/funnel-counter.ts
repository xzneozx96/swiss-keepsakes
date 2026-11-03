import type { Database } from '../../../platform/db/client.ts'
import type { FunnelCounter } from '../ports.ts'
import { sql } from 'drizzle-orm'

// Calls the one SQL function that writes the counter: a single INSERT .. ON CONFLICT DO UPDATE, so parallel
// calls do not lose a count.
export function createFunnelCounter(db: Pick<Database, 'execute'>): FunnelCounter {
  return {
    async countOrderSubmit(day, referrerClass, segment) {
      await db.execute(sql`select analytics.record_order_submit(${day}::date, ${referrerClass}::text, ${segment}::text)`)
    },
  }
}
