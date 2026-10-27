import type { Tx } from '../../../platform/db/client.ts'
import type { MediaRepository, MediaRow } from '../ports.ts'
import { sql } from 'drizzle-orm'

export function createMediaRepository(): MediaRepository<Tx> {
  return {
    async find(tx, storeId, ids) {
      // sql.param keeps the array one bound value; a bare array in the template would expand to a list.
      const result = await tx.execute<{ id: string, kind: MediaRow['kind'], status: MediaRow['status'] }>(sql`
        select id, kind, status from content.media
        where store_id = ${storeId} and id = any(${sql.param(ids)}::uuid[])`)
      return result.rows
    },
  }
}
