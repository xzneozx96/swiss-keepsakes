import type { CartLine } from "../types";
import type { DemoState } from "@/features/demo/types";

import { productEarliestPickup } from "@/features/catalog/lib/pickup";
import { useDemo } from "@/features/demo";
import { demoNow } from "@/features/demo/clock";

const sameChoice = (a: Omit<CartLine, "id">, b: Omit<CartLine, "id">) =>
  a.productId === b.productId &&
  a.variantId === b.variantId &&
  (a.engraving ?? "") === (b.engraving ?? "") &&
  a.pickupDate === b.pickupDate &&
  a.pickupPlaceId === b.pickupPlaceId;

const withCart = (s: DemoState, cart: CartLine[]): DemoState => ({
  ...s,
  data: { ...s.data, cart },
});

function dayBefore(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00Z`);

  d.setUTCDate(d.getUTCDate() - 1);

  return d.toISOString().slice(0, 10);
}

/**
 * The guest's cart in the demo store. Adding the same choice again raises its quantity.
 * New lines start unticked (owner rule: nothing is pre-selected).
 */
export function useCart() {
  const { state, update } = useDemo();
  const lines = state.data.cart;

  const add = (line: Omit<CartLine, "id">) =>
    update((s) => {
      const cart = s.data.cart;
      const match = cart.find((l) => sameChoice(l, line));
      const next = match
        ? cart.map((l) =>
            l === match ? { ...l, quantity: l.quantity + line.quantity } : l,
          )
        : [...cart, { ...line, id: crypto.randomUUID() }];

      return withCart(s, next);
    });

  const setQuantity = (id: string, quantity: number) =>
    update((s) =>
      withCart(
        s,
        s.data.cart.map((l) =>
          l.id === id ? { ...l, quantity: Math.max(1, quantity) } : l,
        ),
      ),
    );

  const remove = (id: string) =>
    update((s) =>
      withCart(
        s,
        s.data.cart.filter((l) => l.id !== id),
      ),
    );

  /** Moves a line to another requested date; joins an identical line if there is one. */
  const changeDate = (id: string, pickupDate: string) =>
    update((s) => {
      const line = s.data.cart.find((l) => l.id === id);

      if (!line) return s;

      const moved = { ...line, pickupDate };
      const match = s.data.cart.find(
        (l) => l.id !== id && sameChoice(l, moved),
      );
      const next = match
        ? s.data.cart
            .filter((l) => l.id !== id)
            .map((l) =>
              l === match
                ? {
                    ...l,
                    quantity: l.quantity + line.quantity,
                    // A ticked line stays ticked when it joins its twin.
                    selected: l.selected || line.selected,
                  }
                : l,
            )
        : s.data.cart.map((l) => (l.id === id ? moved : l));

      return withCart(s, next);
    });

  /** Ticks or unticks the given lines (C04 selection); only ticked lines go to C06. */
  const select = (ids: string[], selected: boolean) =>
    update((s) =>
      withCart(
        s,
        s.data.cart.map((l) => (ids.includes(l.id) ? { ...l, selected } : l)),
      ),
    );

  /**
   * Prototype control: moves the first line to the day before its earliest pickup, as if
   * the guest had waited too long (or used "Request again"), so C04 shows the invalid-date
   * state. Not part of the product UI.
   */
  const makeDateTooEarly = () =>
    update((s) => {
      const [first, ...rest] = s.data.cart;
      const product = s.data.products.find((p) => p.id === first?.productId);

      if (!first || !product) return s;

      const earliest = productEarliestPickup(
        product,
        demoNow(s.clockStartedAt),
      );

      return withCart(s, [
        { ...first, pickupDate: dayBefore(earliest) },
        ...rest,
      ]);
    });

  return {
    lines,
    count: lines.reduce((sum, l) => sum + l.quantity, 0),
    add,
    setQuantity,
    remove,
    changeDate,
    select,
    makeDateTooEarly,
  };
}
