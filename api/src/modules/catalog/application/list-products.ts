import type { Actor } from '@sk/domain/identity'
import type { Localized, MediaInfo, ProductListPage, ProductListQuery, ProductListRow, ProductListStatus } from '../ports.ts'
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

export interface ProductListResult {
  entries: ProductListEntry[]
  total: number
  page: number
  pageSize: number
  statuses: Record<ProductListStatus, number>
}

// The cover, the sales and the stock of the rows of one page, each read once for all of them (ADR-013: no join across modules).
async function entriesOf<T>({ media, sales, stockLevels }: CatalogDeps<T>, tx: T, storeId: string, rows: ProductListRow[]): Promise<ProductListEntry[]> {
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
  return rows.map(row => ({ row, cover: row.coverMediaId ? found.get(row.coverMediaId.toLowerCase()) ?? null : null, hasOrders: sold.has(row.id), soldOutCount: soldOut(row) }))
}

// One page of the keepsakes of the store with the total and the status counts, each with its first photo and its sold-out count. The
// stock is read once for the listed variants of the page.
export function makeListProducts<T>(deps: CatalogDeps<T>) {
  return async (actor: Actor, storeId: string, query: ProductListQuery): Promise<Result<ProductListResult>> => {
    if (!mayEditCatalog(actor, storeId))
      return fail({ reason: 'forbidden' })
    return deps.uow.run(async (tx) => {
      const { rows, total, statuses }: ProductListPage = await deps.products.list(tx, storeId, query)

      return ok({ entries: await entriesOf(deps, tx, storeId, rows), total, page: query.page, pageSize: query.pageSize, statuses })
    })
  }
}

// The keepsakes the caller already references (a story's linked keepsakes), read by id, whatever their status. At most 50 ids.
export function makeLookupProducts<T>(deps: CatalogDeps<T>) {
  return async (actor: Actor, storeId: string, ids: string[]): Promise<Result<ProductListEntry[]>> => {
    if (!mayEditCatalog(actor, storeId))
      return fail({ reason: 'forbidden' })
    return deps.uow.run(async tx => ok(await entriesOf(deps, tx, storeId, await deps.products.byIds(tx, storeId, ids))))
  }
}

// The most option names the suggestions hold (ADR-033: a whole list names its cap).
const OPTION_NAMES_CAP = 50

// The option names the shop already uses, for the name field's suggestions. Whole, at most 50.
export function makeListOptionNames<T>({ uow, products }: CatalogDeps<T>) {
  return async (actor: Actor, storeId: string, exceptId?: string): Promise<Result<Localized[]>> => {
    if (!mayEditCatalog(actor, storeId))
      return fail({ reason: 'forbidden' })
    return ok(await uow.run(tx => products.optionNames(tx, storeId, OPTION_NAMES_CAP, exceptId)))
  }
}
