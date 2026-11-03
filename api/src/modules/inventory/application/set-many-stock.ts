import type { Actor } from '@sk/domain/identity'
import type { InventoryDeps } from './deps.ts'
import type { Result } from './failure.ts'
import type { StockEntry } from './stock-entry.ts'
import { mayEditCatalog, staffActor } from './access.ts'
import { fail, ok } from './failure.ts'
import { entryOf, withPhotos } from './stock-entry.ts'

// Sets the units on the shelf of several live variants in one transaction, all or nothing (the keepsake editor saves a
// grid). The rows are locked in sku_id order, so two saves cannot deadlock. Every SKU is checked before any is written;
// the first one that is not found, or that falls below its reserved units, refuses the request and names it. The rows
// come back in the order of the request.
export function makeSetManyStock<T>({ uow, stock, skus, media, audit, clock }: InventoryDeps<T>) {
  return async (actor: Actor, storeId: string, items: { skuId: string, onHand: number }[], requestId: string | null): Promise<Result<StockEntry[]>> => {
    if (!mayEditCatalog(actor, storeId) || actor.kind !== 'staff')
      return fail({ reason: 'forbidden' })
    return uow.run(async (tx) => {
      const sorted = [...items].sort((a, b) => (a.skuId < b.skuId ? -1 : a.skuId > b.skuId ? 1 : 0))
      const ids = sorted.map(item => item.skuId)
      const live = new Map((await skus.liveSkus(tx, storeId, ids)).map(sku => [sku.skuId, sku]))
      const missing = sorted.find(item => !live.has(item.skuId))
      if (missing)
        return fail({ reason: 'not-found', skuId: missing.skuId })
      const levels = new Map((await stock.lock(tx, storeId, ids)).map(level => [level.skuId, level]))
      const below = sorted.find(item => item.onHand < levels.get(item.skuId)!.reserved)
      if (below)
        return fail({ reason: 'stock-below-reserved', reserved: levels.get(below.skuId)!.reserved, skuId: below.skuId })
      const at = clock.now()
      for (const { skuId, onHand } of sorted) {
        const before = levels.get(skuId)!.onHand
        if (onHand === before)
          continue
        await stock.set(tx, { storeId, skuId, before, after: onHand, actorUserId: actor.userId, at })
        await audit.record(tx, { storeId, actor: staffActor(actor), entity: 'stock', entityId: skuId, action: 'set', before: { onHand: before }, after: { onHand }, requestId })
      }

      return ok(await withPhotos(media, tx, storeId, items.map(({ skuId, onHand }) => entryOf(live.get(skuId)!, { onHand, reserved: levels.get(skuId)!.reserved }))))
    })
  }
}
