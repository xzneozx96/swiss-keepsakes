import type { Actor } from '@sk/domain/identity'
import type { MediaInfo, ProductListRow } from '../ports.ts'
import type { CatalogDeps } from './deps.ts'
import type { Result } from './failure.ts'
import { mayEditCatalog } from './access.ts'
import { fail, ok } from './failure.ts'

export interface ProductListEntry {
  row: ProductListRow
  cover: MediaInfo | null
  // An order line names it, so removing it archives. False when no sales directory is wired.
  hasOrders: boolean
  // Variants of the keepsake that are not archived and have no unit available. A variant with no stock row counts. 0 when
  // no stock port is wired.
  soldOutCount: number
}

// The keepsakes of the store, newest first, each with its first photo and its sold-out count. The count comes from one
// stock read for all listed variants (ADR-013: no join across modules).
export function makeListProducts<T>({ uow, products, media, sales, stockLevels }: CatalogDeps<T>) {
  return async (actor: Actor, storeId: string): Promise<Result<ProductListEntry[]>> => {
    if (!mayEditCatalog(actor, storeId))
      return fail({ reason: 'forbidden' })
    return uow.run(async (tx) => {
      const rows = await products.list(tx, storeId)
      const ids = rows.flatMap(row => row.coverMediaId ?? [])
      const found = new Map((ids.length > 0 ? await media.find(tx, storeId, ids) : []).map(file => [file.id.toLowerCase(), file]))
      const sold = sales && rows.length > 0 ? await sales.soldProductIds(tx, storeId, rows.map(row => row.id)) : new Set<string>()
      const skuIds = rows.flatMap(row => row.liveSkuIds)
      const levels = stockLevels && skuIds.length > 0 ? await stockLevels.levels(tx, storeId, skuIds) : undefined
      const soldOut = (row: ProductListRow) => {
        if (!levels)
          return 0
        return row.liveSkuIds.filter((id) => {
          const level = levels.get(id)

          return !level || level.onHand - level.reserved <= 0
        }).length
      }
      return ok(rows.map(row => ({ row, cover: row.coverMediaId ? found.get(row.coverMediaId.toLowerCase()) ?? null : null, hasOrders: sold.has(row.id), soldOutCount: soldOut(row) })))
    })
  }
}
