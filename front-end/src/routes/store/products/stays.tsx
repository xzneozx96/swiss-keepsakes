import { createFileRoute } from "@tanstack/react-router";

import { MerchantProducts } from "@/features/merchant/products/components/merchant-products";

// M11 Products › Stays.
export const Route = createFileRoute("/store/products/stays")({
  component: () => <MerchantProducts tab="stays" />,
});
