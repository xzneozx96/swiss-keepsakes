import type { StockItem, StockList, StockRow } from '@sk/api-contract'
import type { StockItemEntry } from '../application/get-stock-item.ts'
import type { StockListEntry } from '../application/list-stock.ts'
import type { StockEntry } from '../application/stock-entry.ts'

export function stockRowView({ sku, onHand, reserved, available, photo }: StockEntry): StockRow {
  return { skuId: sku.skuId, productId: sku.productId, code: sku.code, keepsakeName: sku.keepsakeName, variantTitle: sku.variantTitle, photo, onHand, reserved, available }
}

export function stockItemView(entry: StockItemEntry): StockItem {
  return {
    ...stockRowView(entry),
    // The orders module is not built: the order reference and the guest are unknown until it exists (E7.x).
    reservations: entry.reservations.map(hold => ({ orderId: hold.orderId, orderRef: null, guestName: null, acceptedAt: hold.acceptedAt.toISOString(), quantity: hold.quantity })),
  }
}

export function stockListView({ items, total, page, pageSize, counts }: StockListEntry): StockList {
  return { items: items.map(stockRowView), total, page, pageSize, counts }
}
