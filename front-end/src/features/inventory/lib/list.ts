import type { StockRow } from '@sk/api-contract'

/** The tabs of the list. A variant is under Sold out when no unit is available, even if some are in stock and all are reserved. */
export const STOCK_TABS = ['all', 'inStock', 'soldOut'] as const

export type StockTab = (typeof STOCK_TABS)[number]

export const isSoldOut = (row: Pick<StockRow, 'available'>) => row.available === 0

export const INVENTORY_PAGE_SIZE = 10

/** The most rows the API skips (its `MAX_OFFSET`). */
const MAX_OFFSET = 10_000

/** The last page the API serves at this page size: it refuses a skip over 10,000 rows. A link past it opens here, and the screen moves to the last real page. */
const MAX_PAGE = Math.floor(MAX_OFFSET / INVENTORY_PAGE_SIZE) + 1

/** The API's name of each tab (`filter`); All is none. */
export const FILTER_OF_TAB = { all: undefined, inStock: 'in-stock', soldOut: 'sold-out' } as const

/**
 * The stock table's place in the URL: the tab, the search and the page (ADR-033). All is no `tab`, page 1 is no `page`.
 * The server filters, counts and pages.
 */
export interface InventorySearch {
  tab?: Exclude<StockTab, 'all'>
  q?: string
  page?: number
}

/** The route's `validateSearch`: anything it does not know is dropped, so a hand-edited link still opens the page. */
export function parseInventorySearch(search: Record<string, unknown>): InventorySearch {
  const page = Number(search.page)

  return {
    tab: search.tab === 'inStock' || search.tab === 'soldOut' ? search.tab : undefined,
    q: typeof search.q === 'string' && search.q.trim() ? search.q : undefined,
    page: Number.isInteger(page) && page > 1 ? Math.min(page, MAX_PAGE) : undefined,
  }
}
