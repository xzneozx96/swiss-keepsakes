import type { InventoryDeps } from './deps.ts'

// The stock row of each SKU a catalog write has just created, in that write's transaction (ADR-013: the composition root
// hands this to the catalog as a port). Rows go in sku_id order, as the holds' callers lock them. A SKU that already has a
// row fails, so a duplicate is never hidden.
export function makeSeedStock<T>({ stock }: Pick<InventoryDeps<T>, 'stock'>) {
  return async (tx: T, storeId: string, items: { skuId: string, quantity: number }[], actorUserId: string): Promise<void> => {
    if (items.length === 0)
      return
    const sorted = [...items].sort((a, b) => (a.skuId < b.skuId ? -1 : a.skuId > b.skuId ? 1 : 0))

    await stock.seed(tx, storeId, sorted, actorUserId)
  }
}
