import type { StockItem, StockList, StockRow } from '@sk/api-contract'

/** A command carries the `Idempotency-Key` of the user's intent, so a retry of it is the same request to the API. */
export type Keyed<T> = T & { idempotencyKey: string }

/**
 * The store's stock per variant (E6.3). There is no demo implementation: every call goes to the API, and a refusal
 * arrives as an `InventoryProblem`.
 */
export interface InventoryClient {
  /** Every live variant of the store with its stock, and the figures of the three tabs. The screen filters and searches them. */
  list: (storeId: string) => Promise<StockList>
  /** One variant with the open orders that reserve its units. */
  get: (input: { storeId: string, skuId: string }) => Promise<StockItem>
  /** Sets the units in stock of one variant. Refused with `stock-below-reserved` (a 422) below the reserved units. */
  set: (input: Keyed<{ storeId: string, skuId: string, onHand: number }>) => Promise<StockRow>
}
