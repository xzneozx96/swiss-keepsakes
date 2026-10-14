import type { Order } from "@/features/orders/types";

import { useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";

import { useLocale } from "@/contexts/locale-context";
import { shop } from "@/features/catalog/seed";
import {
  useBlockText,
  useOrderActions,
} from "@/features/orders/hooks/use-orders";
import { amountDueNow } from "@/features/orders/lib/selectors";
import { startOnlinePaymentBlock } from "@/features/orders/lib/transitions";
import { formatMoney } from "@/lib/format";

export type Outcome = "succeeded" | "failed" | "processing";

/**
 * What the simulated provider shows: `choose` (the three outcomes), `failed` (after Fail, with
 * retry), `processing` (a payment is already open, so no second Pay) or `blocked` (nothing to pay).
 */
export type PaymentStep =
  | { kind: "choose" }
  | { kind: "failed" }
  | { kind: "processing" }
  | { kind: "blocked"; reason: string };

export interface PaymentView {
  seller: string;
  amount: string;
  ref: string;
  step: PaymentStep;
  /** True from the first press until the screen changes, so a double tap never pays twice. */
  isPending: boolean;
  choose: (outcome: Outcome) => void;
  retry: () => void;
  back: () => void;
}

/** C12 simulated payment provider for one order, driven only by T0's guard and `payOnline`. */
export function usePayment(order: Order): PaymentView {
  const { intlLocale } = useLocale();
  const actions = useOrderActions();
  const blockText = useBlockText();
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);
  const [isPending, setPending] = useState(false);
  // A ref, not only state: a double tap fires both clicks before React re-renders.
  const pending = useRef(false);
  // The amount at page open: after Pay the order moves on and amountDueNow changes.
  const [amount] = useState(() => amountDueNow(order));
  const block = startOnlinePaymentBlock(order);

  const toOrder = () =>
    void navigate({
      to: "/account/orders/$orderId",
      params: { orderId: order.id },
      replace: true,
    });

  const step: PaymentStep = failed
    ? { kind: "failed" }
    : !block
      ? { kind: "choose" }
      : block.code === "payment-processing"
        ? { kind: "processing" }
        : { kind: "blocked", reason: blockText(block).text };

  return {
    seller: shop.name,
    amount: formatMoney(amount / 100, intlLocale),
    ref: order.ref,
    step,
    isPending,
    choose: (outcome) => {
      if (pending.current) return;
      const settle = () => {
        pending.current = false;
        setPending(false);
      };

      pending.current = true;
      setPending(true);
      if (actions.payOnline(order.id, outcome)) return settle();
      if (outcome !== "failed") return toOrder();
      setFailed(true);
      settle();
    },
    retry: () => setFailed(false),
    back: toOrder,
  };
}
