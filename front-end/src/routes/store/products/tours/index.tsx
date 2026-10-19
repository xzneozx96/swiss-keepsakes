import { createFileRoute } from '@tanstack/react-router'

import { MerchantProducts } from '@/features/merchant/products/components/merchant-products'

// M11 Products › Tours.
export const Route = createFileRoute('/store/products/tours/')({
  component: () => <MerchantProducts tab="tours" />,
})
