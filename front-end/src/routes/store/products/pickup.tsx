import { createFileRoute } from "@tanstack/react-router";

import { MerchantProducts } from "@/features/merchant/products/components/merchant-products";

// M11 Products › Pickup.
export const Route = createFileRoute("/store/products/pickup")({
  component: () => <MerchantProducts tab="pickup" />,
});
