import { createFileRoute } from '@tanstack/react-router'

import { InventoryList } from '@/features/inventory/components/inventory-list'

// N13 Products › Inventory. The item page of a variant is /store/products/inventory/$skuId.
export const Route = createFileRoute('/store/products/inventory/')({
  component: InventoryList,
})
