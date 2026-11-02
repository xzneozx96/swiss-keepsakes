import type { Tx } from '../../../platform/db/client.ts'
import { sql } from 'drizzle-orm'

// The catalog's `KeepsakeLinks` port, filled by content (ADR-013: by plain id, wired in main.ts). A story or tour names a
// keepsake in a link row with no foreign key; deleting the keepsake removes those rows in the same transaction.
export function createKeepsakeLinks() {
  return {
    async removeAll(tx: Tx, storeId: string, productId: string) {
      await tx.execute(sql`delete from content.story_keepsake_links where store_id = ${storeId} and product_id = ${productId}`)
      await tx.execute(sql`delete from content.tour_keepsake_links where store_id = ${storeId} and product_id = ${productId}`)
    },
  }
}
