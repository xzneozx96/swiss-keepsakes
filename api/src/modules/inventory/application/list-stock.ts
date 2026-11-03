import type { Actor } from '@sk/domain/identity'
import type { LiveSku, Localized } from '../ports.ts'
import type { InventoryDeps } from './deps.ts'
import type { Result } from './failure.ts'
import type { StockEntry } from './stock-entry.ts'
import { mayEditCatalog } from './access.ts'
import { fail, ok } from './failure.ts'
import { entryOf, withPhotos } from './stock-entry.ts'

export type StockFilter = 'all' | 'in-stock' | 'sold-out'

export interface StockListEntry {
  items: StockEntry[]
  // The tab figures of the whole store, counted before the filter and the search.
  counts: { all: number, inStock: number, soldOut: number }
}

const label = (text: Localized) => text.en || text.de || ''

const matches = (sku: LiveSku, needle: string) =>
  [sku.code ?? '', sku.variantTitle.en ?? '', sku.variantTitle.de ?? '', sku.keepsakeName.en ?? '', sku.keepsakeName.de ?? ''].some(text => text.toLowerCase().includes(needle))

// The live variants of the store in the order of keepsake name, variant title, code. The directory lists the variants,
// the stock rows give the figures, so an archived variant or an orphaned stock row never appears. A variant with no
// stock row yet counts as 0 (E6.3: the catalog creates the row with the variant).
export function makeListStock<T>({ uow, stock, skus, media }: InventoryDeps<T>) {
  return async (actor: Actor, storeId: string, query: { filter?: StockFilter, q?: string }): Promise<Result<StockListEntry>> => {
    if (!mayEditCatalog(actor, storeId))
      return fail({ reason: 'forbidden' })
    return uow.run(async (tx) => {
      const [live, levels] = await Promise.all([skus.liveSkus(tx, storeId), stock.levels(tx, storeId)])
      const byId = new Map(levels.map(level => [level.skuId, level]))
      const all = live
        .map(sku => entryOf(sku, byId.get(sku.skuId)))
        .sort((a, b) => label(a.sku.keepsakeName).localeCompare(label(b.sku.keepsakeName)) || label(a.sku.variantTitle).localeCompare(label(b.sku.variantTitle)) || (a.sku.code ?? '').localeCompare(b.sku.code ?? '') || a.sku.skuId.localeCompare(b.sku.skuId))
      const counts = { all: all.length, inStock: all.filter(entry => entry.available > 0).length, soldOut: all.filter(entry => entry.available <= 0).length }
      const filter = query.filter ?? 'all'
      const needle = (query.q ?? '').trim().toLowerCase()
      const shown = all
        .filter(entry => filter === 'all' || (filter === 'in-stock') === entry.available > 0)
        .filter(entry => needle === '' || matches(entry.sku, needle))

      return ok({ items: await withPhotos(media, tx, storeId, shown), counts })
    })
  }
}
