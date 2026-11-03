import { createFileRoute } from '@tanstack/react-router'

import { NewKeepsake } from '@/features/keepsakes/components/new-keepsake-editor'

// A new keepsake in the stepped editor: Details, Options and Variants in the browser, then a draft that opens at
// /store/products/gifts/$productId on Review and publish. A static segment, so it wins over $productId.
export const Route = createFileRoute('/store/products/gifts/new')({
  component: NewKeepsake,
})
