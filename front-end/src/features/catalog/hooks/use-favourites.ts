import { useCallback } from "react";

import { useDemoActions, useDemoSelector } from "@/features/demo";

type Update = ReturnType<typeof useDemoActions>["update"];

const toggleIn = (update: Update, productId: string) =>
  update((s) => {
    const current = s.data.favouriteProductIds;
    const next = current.includes(productId)
      ? current.filter((id) => id !== productId)
      : [...current, productId];

    return { ...s, data: { ...s.data, favouriteProductIds: next } };
  });

/**
 * Saved gifts (UX proposal: favourites are not in the PRD). Kept in the demo data,
 * so they work without signing in and survive reloads in this browser.
 * A list that needs many ids at once reads them all here.
 */
export function useFavourites() {
  const { update } = useDemoActions();
  const ids = useDemoSelector((s) => s.data.favouriteProductIds);
  const toggle = useCallback(
    (productId: string) => toggleIn(update, productId),
    [update],
  );

  return {
    isFavourite: (productId: string) => ids.includes(productId),
    toggle,
  };
}

/** One listing's saved state. It re-renders only when this listing's flag flips, not on every other save. */
export function useFavourite(listingId: string) {
  const { update } = useDemoActions();
  const saved = useDemoSelector((s) =>
    s.data.favouriteProductIds.includes(listingId),
  );
  const toggle = useCallback(
    () => toggleIn(update, listingId),
    [update, listingId],
  );

  return { saved, toggle };
}
