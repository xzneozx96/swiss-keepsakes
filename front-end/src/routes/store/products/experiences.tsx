import { createFileRoute } from "@tanstack/react-router";

import { MerchantProducts } from "@/features/merchant/products/components/merchant-products";

// M11 Products › Experiences.
export const Route = createFileRoute("/store/products/experiences")({
  component: () => <MerchantProducts tab="experiences" />,
});
