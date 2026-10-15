import type { LocalizedText, Subcategory } from "@/features/catalog/types";

import { uniqueSlug } from "../lib/records";

import { useDemo } from "@/features/demo";

/**
 * M26 data: the store's own sub-categories under Keepsakes (PRD §7.0), their order, and how
 * many keepsakes each holds. A sub-category with keepsakes cannot be deleted, so no product
 * is ever left without one.
 */
export function useSubcategories() {
  const { state, update } = useDemo();
  const { subcategories, products } = state.data;
  const keepsakes = subcategories.filter((c) => c.categoryId === "keepsakes");

  const set = (change: (list: Subcategory[]) => Subcategory[]) =>
    update((s) => ({
      ...s,
      data: { ...s.data, subcategories: change(s.data.subcategories) },
    }));

  return {
    keepsakes,
    countOf: (id: string) =>
      products.filter((p) => p.subcategoryId === id).length,
    add: (name: LocalizedText) =>
      set((list) => [
        ...list,
        {
          id: uniqueSlug(
            name,
            list.map((c) => c.id),
            "subcategory",
          ),
          categoryId: "keepsakes",
          name,
        },
      ]),
    rename: (id: string, name: LocalizedText) =>
      set((list) => list.map((c) => (c.id === id ? { ...c, name } : c))),
    /** Swaps with the neighbour in the same category; the list order is the guests' order. */
    move: (id: string, direction: -1 | 1) =>
      set((list) => {
        const from = list.findIndex((c) => c.id === id);
        const category = list[from]?.categoryId;
        let to = from + direction;

        while (list[to] && list[to].categoryId !== category) to += direction;
        if (!list[to]) return list;
        const next = [...list];

        [next[from], next[to]] = [next[to], next[from]];

        return next;
      }),
    remove: (id: string) =>
      set((list) =>
        products.some((p) => p.subcategoryId === id)
          ? list
          : list.filter((c) => c.id !== id),
      ),
  };
}
