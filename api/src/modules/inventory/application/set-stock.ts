import type { Actor } from '@sk/domain/identity'
import type { InventoryDeps } from './deps.ts'
import type { Result } from './failure.ts'
import type { StockEntry } from './stock-entry.ts'
import { mayEditCatalog, staffActor } from './access.ts'
import { fail, ok } from './failure.ts'
import { entryOf, withPhotos } from './stock-entry.ts'

// The merchant sets the units on the shelf of one live variant. The row is locked first: holds take the same lock, so
// the reserved count read here is the one the CHECK sees. Below the reserved units is refused with that count. The same
// value writes nothing (no adjustment, no audit entry). Otherwise one `set` adjustment with the acting user and one audit
// entry are written in this transaction.
export function makeSetStock<T>({ uow, stock, skus, media, audit, clock }: InventoryDeps<T>) {
  return async (actor: Actor, storeId: string, skuId: string, onHand: number, requestId: string | null): Promise<Result<StockEntry>> => {
    if (!mayEditCatalog(actor, storeId) || actor.kind !== 'staff')
      return fail({ reason: 'forbidden' })
    return uow.run(async (tx) => {
      const sku = (await skus.liveSkus(tx, storeId, [skuId])).find(live => live.skuId === skuId)
      if (!sku)
        return fail({ reason: 'not-found' })
      const [level] = await stock.lock(tx, storeId, [skuId])
      if (onHand < level!.reserved)
        return fail({ reason: 'stock-below-reserved', reserved: level!.reserved, skuId })
      if (onHand !== level!.onHand) {
        await stock.set(tx, { storeId, skuId, before: level!.onHand, after: onHand, actorUserId: actor.userId, at: clock.now() })
        await audit.record(tx, { storeId, actor: staffActor(actor), entity: 'stock', entityId: skuId, action: 'set', before: { onHand: level!.onHand }, after: { onHand }, requestId })
      }
      const [entry] = await withPhotos(media, tx, storeId, [entryOf(sku, { onHand, reserved: level!.reserved })])

      return ok(entry!)
    })
  }
}
