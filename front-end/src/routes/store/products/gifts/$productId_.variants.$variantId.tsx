import { createFileRoute } from '@tanstack/react-router'

import { VariantScreen } from '@/features/keepsakes/components/variant-page'

// The variant page of a keepsake. The `_` after $productId keeps it a sibling of the keepsake page, not a child of it.
export const Route = createFileRoute('/store/products/gifts/$productId_/variants/$variantId')({
  component: VariantPage,
})

function VariantPage() {
  const { productId, variantId } = Route.useParams()

  return <VariantScreen id={productId} variantId={variantId} />
}
