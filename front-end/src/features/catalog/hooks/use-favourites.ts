import { useCallback } from "react";

import { useDemoActions, useDemoSelector } from "@/features/demo";

/**
 * Saved gifts (UX proposal: favourites are not in the PRD). Kept in the demo data,
 * so they work without signing in and survive reloads in this browser.
 */
export function useFavourites() {
  const { update } = useDemoActions();
  const ids = useDemoSelector((s) => s.data.favouriteProductIds);

  const toggle = useCallback(
    (productId: string) =>
      update((s) => {
        const current = s.data.favouriteProductIds;
        const next = current.includes(productId)
          ? current.filter((id) => id !== productId)
          : [...current, productId];

        return { ...s, data: { ...s.data, favouriteProductIds: next } };
      }),
    [update],
  );

  return {
    isFavourite: (productId: string) => ids.includes(productId),
    toggle,
  };
}
