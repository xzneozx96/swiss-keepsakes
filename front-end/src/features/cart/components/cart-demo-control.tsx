import { Button } from "@heroui/react";
import { useNavigate } from "@tanstack/react-router";

import { useCart } from "../hooks/use-cart";

/**
 * Prototype-bar control (English, outside the product UI): makes the first cart line's
 * date too early so C04 shows the invalid-date state (AC04), then opens the cart.
 */
export function CartDemoControl({ onDone }: { onDone: () => void }) {
  const { lines, makeDateTooEarly } = useCart();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Cart</p>
      <Button
        className="self-start"
        isDisabled={lines.length === 0}
        size="sm"
        variant="tertiary"
        onPress={() => {
          makeDateTooEarly();
          onDone();
          void navigate({ to: "/cart" });
        }}
      >
        Make a cart date too early
      </Button>
      <p className="text-sm text-muted">
        Moves the first gift in the cart to the day before its earliest pickup,
        as if the guest had waited too long.
      </p>
    </div>
  );
}
