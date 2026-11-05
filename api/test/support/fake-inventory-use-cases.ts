import type { InventoryUseCases } from '../../src/modules/inventory/adapters/routes.ts'
import type { StockEntry } from '../../src/modules/inventory/application/stock-entry.ts'

function entry(skuId: string): StockEntry {
  return {
    sku: { skuId, productId: '0190f0c2-0000-7000-8000-0000000000c1', code: 'VX-1', keepsakeName: { en: 'Victorinox' }, variantTitle: {}, mediaId: null, keepsakePhotoId: null },
    onHand: 5,
    reserved: 0,
    available: 5,
    photo: null,
  }
}

// Stand-ins for the inventory use cases, for tests of the routes' guards over createApp. Each answers as if the row
// existed and the caller could do the thing, so a request that gets past the guard is not a 404 or a 403.
export function createFakeInventoryUseCases(): InventoryUseCases {
  return {
    listStock: async (_actor, _storeId, query) => ({ ok: true, value: { items: [], total: 0, page: query.page, pageSize: query.pageSize, counts: { all: 0, inStock: 0, soldOut: 0 } } }),
    getStockItem: async (_actor, _storeId, skuId) => ({ ok: true, value: { ...entry(skuId), reservations: [] } }),
    setStock: async (_actor, _storeId, skuId) => ({ ok: true, value: entry(skuId) }),
    setManyStock: async (_actor, _storeId, items) => ({ ok: true, value: items.map(item => entry(item.skuId)) }),
  }
}
