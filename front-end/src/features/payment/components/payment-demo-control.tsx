import { Button } from "@heroui/react";
import { useParams } from "@tanstack/react-router";

import { useDemo } from "@/features/demo";
import { useOrderActions } from "@/features/orders/hooks/use-orders";
import { processingPayment } from "@/features/orders/lib/selectors";

/**
 * Prototype-bar control for C12 (English, outside the product UI): the provider answers a
 * payment left "Processing", for the order on screen. After "Expire this order's payment
 * deadline" this shows the late provider result (S3, R05): the order stays cancelled.
 */
export function PaymentDemoControl({ onDone }: { onDone: () => void }) {
  const { state } = useDemo();
  const actions = useOrderActions();
  const { orderId } = useParams({ strict: false });
  const order = state.data.orders.find((o) => o.id === orderId);
  const pending = !!order && !!processingPayment(order);

  const answer = (outcome: "succeeded" | "failed") => {
    if (order) actions.resolveOnlinePayment(order.id, outcome);
    onDone();
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Payment provider</p>
      <div className="flex flex-wrap gap-2">
        <Button
          isDisabled={!pending}
          size="sm"
          variant="tertiary"
          onPress={() => answer("succeeded")}
        >
          Provider confirms the payment
        </Button>
        <Button
          isDisabled={!pending}
          size="sm"
          variant="tertiary"
          onPress={() => answer("failed")}
        >
          Provider rejects the payment
        </Button>
      </div>
      <p className="text-sm text-muted">
        Works on an order whose payment is processing
        {order ? ` (on screen: ${order.ref})` : ""}. To show a late result,
        choose Processing on the payment page, expire the deadline, then confirm
        here: the order stays cancelled.
      </p>
    </div>
  );
}
