import { Button } from "@heroui/react";
import { useNavigate } from "@tanstack/react-router";

import { useDemo } from "@/features/demo";
import { useGuestOrders } from "@/features/orders/hooks/use-orders";

/**
 * Prototype-bar control (English, outside the product UI): removes the signed-in guest's
 * orders so C14 shows its empty state, then opens the Account tab. Reset brings them back.
 */
export function TransactionsDemoControl({ onDone }: { onDone: () => void }) {
  const { update } = useDemo();
  const orders = useGuestOrders();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Transactions</p>
      <Button
        className="self-start"
        isDisabled={orders.length === 0}
        size="sm"
        variant="tertiary"
        onPress={() => {
          update((s) => ({
            ...s,
            data: {
              ...s.data,
              orders: s.data.orders.filter(
                (o) => o.guestId !== s.data.signedInGuestId,
              ),
            },
          }));
          onDone();
          void navigate({ to: "/account" });
        }}
      >
        Remove my orders
      </Button>
      <p className="text-sm text-muted">
        Signed in only. Shows the empty transactions list; Reset restores the
        orders.
      </p>
    </div>
  );
}
