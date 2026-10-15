import type { ProductTab } from "@/features/merchant/products/hooks/use-merchant-products";

import { createFileRoute, redirect } from "@tanstack/react-router";

import { MerchantProducts } from "@/features/merchant/products/components/merchant-products";
import { isProductTab } from "@/features/merchant/products/hooks/use-merchant-products";

const TAB_PAGES = {
  tours: "/store/products/tours",
  stays: "/store/products/stays",
  experiences: "/store/products/experiences",
  pickup: "/store/products/pickup",
} as const;

// M11 Products › Keepsakes. Tours, Stays, Experiences and M14 Pickup points are pages next
// to it; the old `?tab=` links still land on them. M12 and M13 are
// /store/products/gifts/$productId and /store/products/tours/$tourId.
export const Route = createFileRoute("/store/products/")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { tab?: Exclude<ProductTab, "gifts"> } => ({
    tab:
      isProductTab(search.tab) && search.tab !== "gifts"
        ? search.tab
        : undefined,
  }),
  beforeLoad: ({ search }) => {
    if (search.tab)
      throw redirect({ to: TAB_PAGES[search.tab], replace: true });
  },
  component: () => <MerchantProducts tab="gifts" />,
});
