import type { CartSelectLabels } from "./cart-select-options";

import { Button } from "@heroui/react";

import { StatusSuccessIcon } from "@/components/icons";
import { useLocale } from "@/contexts/locale-context";

export function CartSummarySheet({
  orders,
  labels,
}: {
  orders: { id: string; title: string; gifts: number; subtotal: number }[];
  labels: CartSelectLabels;
}) {
  const { language } = useLocale();
  const total = orders.reduce((sum, order) => sum + order.subtotal, 0);

  return (
    <section
      aria-label={language === "de" ? "Bestellübersicht" : "Order summary"}
      className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-3 rounded-t-3xl bg-surface px-5 pt-4 pb-5 shadow-overlay"
    >
      <dl className="flex flex-col gap-1.5 text-sm">
        {orders.map((order) => (
          <div key={order.id} className="flex justify-between gap-2">
            <dt className="text-muted">
              {order.title} · {labels.gifts(order.gifts)}
            </dt>
            <dd className="shrink-0 tabular-nums">
              {labels.money(order.subtotal)}
            </dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-2 border-t border-separator pt-2">
          <dt className="font-semibold">{labels.totalLabel}</dt>
          <dd className="shrink-0 text-lg font-semibold tabular-nums">
            {labels.money(total)}
          </dd>
        </div>
      </dl>
      <span className="flex items-center gap-1 self-start rounded-full bg-surface-secondary px-2 py-0.5 text-xs">
        <StatusSuccessIcon aria-hidden size={12} />
        {labels.nothingNow}
      </span>
      <Button
        className="h-12 w-full text-base"
        isDisabled={orders.length === 0}
        size="lg"
      >
        {labels.continueLabel(orders.length)}
      </Button>
    </section>
  );
}
