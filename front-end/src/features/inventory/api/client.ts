import type { StockItem, StockList, StockRow } from '@sk/api-contract'

/** What one page of the stock table is asked for (ADR-033). `filter` is the API's: all, in-stock or sold-out. */
export interface StockListQuery {
  filter?: 'in-stock' | 'sold-out' | undefined
  q?: string | undefined
  sort?: 'name' | 'newest' | undefined
  page: number
  pageSize: number
}

/** A command carries the `Idempotency-Key` of the user's intent, so a retry of it is the same request to the API. */
export type Keyed<T> = T & { idempotencyKey: string }

/**
 * The store's stock per variant (E6.3). There is no demo implementation: every call goes to the API, and a refusal
 * arrives as an `InventoryProblem`.
 */
export interface InventoryClient {
  /** One page of the live variants of the store with their stock, the total of the tab and the search, and the figures of the three tabs. */
  list: (input: { storeId: string, query: StockListQuery }) => Promise<StockList>
  /** One variant with the open orders that reserve its units. */
  get: (input: { storeId: string, skuId: string }) => Promise<StockItem>
  /** Sets the units in stock of one variant. Refused with `stock-below-reserved` (a 422) below the reserved units. */
  set: (input: Keyed<{ storeId: string, skuId: string, onHand: number }>) => Promise<StockRow>
}
