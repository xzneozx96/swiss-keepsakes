import type { Actor } from '@sk/domain/identity'
import type { LiveSku, Localized } from '../ports.ts'
import type { InventoryDeps } from './deps.ts'
import type { Result } from './failure.ts'
import type { StockEntry } from './stock-entry.ts'
import { mayEditCatalog } from './access.ts'
import { fail, ok } from './failure.ts'
import { entryOf, withPhotos } from './stock-entry.ts'

export type StockFilter = 'all' | 'in-stock' | 'sold-out'

export interface StockListQuery {
  filter?: StockFilter | undefined
  q?: string | undefined
  // `name`: keepsake name, variant title, code, then variant id descending. `newest`: variant id descending.
  sort: 'name' | 'newest'
  page: number
  pageSize: number
}

export interface StockListEntry {
  // The rows of the page asked for, with their photos.
  items: StockEntry[]
  // The rows that match the filter and the search, before paging.
  total: number
  page: number
  pageSize: number
  // The tab figures of the whole store, counted before the filter and the search.
  counts: { all: number, inStock: number, soldOut: number }
}

const label = (text: Localized) => text.en || text.de || ''

function matches(sku: LiveSku, needle: string) {
  return [sku.code ?? '', sku.variantTitle.en ?? '', sku.variantTitle.de ?? '', sku.keepsakeName.en ?? '', sku.keepsakeName.de ?? ''].some(text => text.toLowerCase().includes(needle))
}

// One page of the live variants of the store in the order of keepsake name, variant title, code (ADR-033 section 6). The directory
// lists the variants (names live in the catalog, so the order and the search cannot be one SQL with the stock, ADR-013), the stock
// rows give the figures, so an archived variant or an orphaned stock row never appears. A variant with no stock row yet counts as 0
// (E6.3: the catalog creates the row with the variant). The filter, the search and the page run here, on the server; only the
// photos of the page are read. The tab counts are those of the whole store.
export function makeListStock<T>({ uow, stock, skus, media }: InventoryDeps<T>) {
  return async (actor: Actor, storeId: string, query: StockListQuery): Promise<Result<StockListEntry>> => {
    if (!mayEditCatalog(actor, storeId))
      return fail({ reason: 'forbidden' })
    return uow.run(async (tx) => {
      const [live, levels] = await Promise.all([skus.liveSkus(tx, storeId), stock.levels(tx, storeId)])
      const byId = new Map(levels.map(level => [level.skuId, level]))
      // Paged here, not in SQL: names live in the catalog, stock in inventory (ADR-013). Fine for hundreds of SKUs a store.
      const byNewest = (a: StockEntry, b: StockEntry) => b.sku.skuId.localeCompare(a.sku.skuId)
      const all = live
        .map(sku => entryOf(sku, byId.get(sku.skuId)))
        .sort(query.sort === 'newest'
          ? byNewest
          : (a, b) => label(a.sku.keepsakeName).localeCompare(label(b.sku.keepsakeName)) || label(a.sku.variantTitle).localeCompare(label(b.sku.variantTitle)) || (a.sku.code ?? '').localeCompare(b.sku.code ?? '') || byNewest(a, b))
      const counts = { all: all.length, inStock: all.filter(entry => entry.available > 0).length, soldOut: all.filter(entry => entry.available <= 0).length }
      const filter = query.filter ?? 'all'
      const needle = (query.q ?? '').trim().toLowerCase()
      const shown = all
        .filter(entry => filter === 'all' || (filter === 'in-stock') === (entry.available > 0))
        .filter(entry => needle === '' || matches(entry.sku, needle))

      // The route's schema already refuses a skip over 10,000 rows (ADR-033 section 6).
      const offset = (query.page - 1) * query.pageSize

      return ok({ items: await withPhotos(media, tx, storeId, shown.slice(offset, offset + query.pageSize)), total: shown.length, page: query.page, pageSize: query.pageSize, counts })
    })
  }
}
