import type { StockRow } from '@sk/api-contract'

/** The tabs of the list. A variant is under Sold out when no unit is available, even if some are in stock and all are reserved. */
export const STOCK_TABS = ['all', 'inStock', 'soldOut'] as const

export type StockTab = (typeof STOCK_TABS)[number]

export const isSoldOut = (row: Pick<StockRow, 'available'>) => row.available === 0

/** The row's own text in both languages, the way the search reads it: the code, the variant title and the keepsake name. */
function searchable(row: StockRow): string[] {
  return [row.code ?? '', row.variantTitle.en ?? '', row.variantTitle.de ?? '', row.keepsakeName.en ?? '', row.keepsakeName.de ?? '']
}

/** The rows of a tab that the search matches, in any case. */
export function filterStock(rows: StockRow[], tab: StockTab, query: string): StockRow[] {
  const needle = query.trim().toLowerCase()

  return rows.filter(row =>
    (tab === 'all' || (tab === 'soldOut') === isSoldOut(row))
    && (needle === '' || searchable(row).some(text => text.toLowerCase().includes(needle))),
  )
}
