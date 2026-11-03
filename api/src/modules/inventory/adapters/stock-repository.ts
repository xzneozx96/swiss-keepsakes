import type { Tx } from '../../../platform/db/client.ts'
import type { Reservation, StockLevel, StockRepository } from '../ports.ts'
import { sql } from 'drizzle-orm'

interface LevelRow extends Record<string, unknown> {
  sku_id: string
  on_hand: number
  held: number
}

interface HoldRow extends Record<string, unknown> {
  order_id: string
  quantity: number
  created_at: string | Date
}

const level = (row: LevelRow): StockLevel => ({ skuId: row.sku_id, onHand: row.on_hand, reserved: row.held })

// Raw SQL on the inventory tables (DM-6), like the catalog's repository. `held` is written by the hold trigger only.
export function createStockRepository(): StockRepository<Tx> {
  return {
    async levels(tx, storeId, skuIds) {
      const rows = await tx.execute<LevelRow>(sql`
        select sku_id, on_hand, held from inventory.stock_items
         where store_id = ${storeId}${skuIds ? sql` and sku_id = any(${sql.param(skuIds)}::uuid[])` : sql``}
         order by sku_id`)
      return rows.rows.map(level)
    },

    // The insert is a no-op for a SKU that has its row. The lock is taken in sku_id order, as the holds' callers insert in that order.
    async lock(tx, storeId, skuIds) {
      await tx.execute(sql`
        insert into inventory.stock_items (sku_id, store_id)
        select id, ${storeId} from unnest(${sql.param(skuIds)}::uuid[]) as id
        on conflict (sku_id) do nothing`)
      const rows = await tx.execute<LevelRow>(sql`
        select sku_id, on_hand, held from inventory.stock_items
         where store_id = ${storeId} and sku_id = any(${sql.param(skuIds)}::uuid[])
         order by sku_id
           for update`)
      return rows.rows.map(level)
    },

    async seed(tx, storeId, items, actorUserId) {
      const rows = sql.join(items.map(({ skuId, quantity }) => sql`(${skuId}, ${storeId}, ${quantity})`), sql`, `)
      await tx.execute(sql`insert into inventory.stock_items (sku_id, store_id, on_hand) values ${rows}`)
      const stocked = items.filter(({ quantity }) => quantity > 0)
      if (stocked.length === 0)
        return
      const history = sql.join(stocked.map(({ skuId, quantity }) => sql`(${storeId}, ${skuId}, 'set', ${quantity}, 0, ${quantity}, ${actorUserId})`), sql`, `)
      await tx.execute(sql`
        insert into inventory.stock_adjustments (store_id, sku_id, kind, delta, on_hand_before, on_hand_after, actor_user_id)
        values ${history}`)
    },

    async openHolds(tx, storeId, skuId) {
      const rows = await tx.execute<HoldRow>(sql`
        select order_id, quantity, created_at from inventory.stock_holds
         where store_id = ${storeId} and sku_id = ${skuId} and state = 'held'
         order by created_at, id`)
      return rows.rows.map((row): Reservation => ({ orderId: row.order_id, acceptedAt: new Date(row.created_at), quantity: row.quantity }))
    },

    async set(tx, { storeId, skuId, before, after, actorUserId, at, reason }) {
      await tx.execute(sql`
        update inventory.stock_items set on_hand = ${after}, row_version = row_version + 1, updated_at = ${at}
         where store_id = ${storeId} and sku_id = ${skuId}`)
      await tx.execute(sql`
        insert into inventory.stock_adjustments (store_id, sku_id, kind, delta, on_hand_before, on_hand_after, actor_user_id, at, reason)
        values (${storeId}, ${skuId}, 'set', ${after - before}, ${before}, ${after}, ${actorUserId}, ${at}, ${reason ?? null})`)
    },
  }
}
