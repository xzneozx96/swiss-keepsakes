import { createFileRoute } from '@tanstack/react-router'

import { PickupPage } from '@/features/merchant/products/components/pickup-page'

// M14 Products › Pickup points: a page of its own, as Inventory.
export const Route = createFileRoute('/store/products/pickup')({
  component: PickupPage,
})
