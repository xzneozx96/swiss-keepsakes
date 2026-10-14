import { useCallback } from "react";

import { useDemo } from "@/features/demo";

/**
 * Saved gifts (UX proposal: favourites are not in the PRD). Kept in the demo data,
 * so they work without signing in and survive reloads in this browser.
 */
export function useFavourites() {
  const { state, update } = useDemo();
  const ids = state.data.favouriteProductIds;

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
