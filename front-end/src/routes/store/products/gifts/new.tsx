import { createFileRoute } from '@tanstack/react-router'

import { CreateKeepsake } from '@/features/keepsakes/components/create-flow'

// Create on M11: Details, then the variant, then a draft keepsake that opens at /store/products/gifts/$productId.
// A static segment, so it wins over $productId.
export const Route = createFileRoute('/store/products/gifts/new')({
  component: CreateKeepsake,
})
