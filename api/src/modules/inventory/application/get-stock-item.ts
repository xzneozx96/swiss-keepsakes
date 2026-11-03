import type { Actor } from '@sk/domain/identity'
import type { Reservation } from '../ports.ts'
import type { InventoryDeps } from './deps.ts'
import type { Result } from './failure.ts'
import type { StockEntry } from './stock-entry.ts'
import { mayEditCatalog } from './access.ts'
import { fail, ok } from './failure.ts'
import { entryOf, withPhotos } from './stock-entry.ts'

export interface StockItemEntry extends StockEntry {
  // The open holds, oldest first.
  reservations: Reservation[]
}

// One live variant with the orders that hold its units. A SKU of another store, an archived one and an unknown one are not found.
export function makeGetStockItem<T>({ uow, stock, skus, media }: InventoryDeps<T>) {
  return async (actor: Actor, storeId: string, skuId: string): Promise<Result<StockItemEntry>> => {
    if (!mayEditCatalog(actor, storeId))
      return fail({ reason: 'forbidden' })
    return uow.run(async (tx) => {
      const sku = (await skus.liveSkus(tx, storeId, [skuId])).find(live => live.skuId === skuId)
      if (!sku)
        return fail({ reason: 'not-found' })
      const [levels, reservations] = await Promise.all([stock.levels(tx, storeId, [skuId]), stock.openHolds(tx, storeId, skuId)])
      const [entry] = await withPhotos(media, tx, storeId, [entryOf(sku, levels[0])])

      return ok({ ...entry!, reservations })
    })
  }
}
