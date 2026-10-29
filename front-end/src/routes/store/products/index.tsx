import { createFileRoute } from '@tanstack/react-router'

import { KeepsakeList } from '@/features/keepsakes/components/keepsake-list'

// M11 Products › Keepsakes. Pickup points are a page of their own (/store/products/pickup). M12 is
// /store/products/gifts/$productId and the create flow is /store/products/gifts/new.
export const Route = createFileRoute('/store/products/')({
  component: KeepsakeList,
})
