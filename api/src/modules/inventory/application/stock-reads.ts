import type { InventoryDeps } from './deps.ts'

// The reads the composition root hands the catalog (ADR-013: through a port, never a join). Both ask the stock table
// only, so they work for archived variants too.

// The units open orders hold, by SKU id: 0 for a SKU with no stock row. Same shape as the catalog's ReservationDirectory.
export function makeReservedBySku<T>({ stock }: Pick<InventoryDeps<T>, 'stock'>) {
  return async (tx: T, storeId: string, skuIds: string[]): Promise<Map<string, number>> => {
    const levels = new Map((skuIds.length > 0 ? await stock.levels(tx, storeId, skuIds) : []).map(level => [level.skuId, level.reserved]))

    return new Map(skuIds.map(skuId => [skuId, levels.get(skuId) ?? 0]))
  }
}

// On hand and reserved, by SKU id. A SKU with no stock row is left out.
export function makeStockLevels<T>({ stock }: Pick<InventoryDeps<T>, 'stock'>) {
  return async (tx: T, storeId: string, skuIds: string[]): Promise<Map<string, { onHand: number, reserved: number }>> => {
    const levels = skuIds.length > 0 ? await stock.levels(tx, storeId, skuIds) : []

    return new Map(levels.map(({ skuId, onHand, reserved }) => [skuId, { onHand, reserved }]))
  }
}
