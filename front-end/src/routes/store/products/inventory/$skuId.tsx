import { createFileRoute } from '@tanstack/react-router'

import { InventoryItem } from '@/features/inventory/components/inventory-item'

// The inventory item page of one variant: its stock, the orders that reserve units, and Adjust stock. Opened from a row of the list.
export const Route = createFileRoute('/store/products/inventory/$skuId')({
  component: ItemPage,
})

function ItemPage() {
  const { skuId } = Route.useParams()

  return <InventoryItem skuId={skuId} />
}
