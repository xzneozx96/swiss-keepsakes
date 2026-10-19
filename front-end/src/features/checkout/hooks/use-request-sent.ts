import type { ReviewOrderView } from "../components/order-card";
import type { ShownLabel } from "@/features/orders/hooks/use-orders";
import type { LocalizedText } from "@/features/catalog/types";
import type { Order } from "@/features/orders/types";

import { useLocale } from "@/contexts/locale-context";
import { zurichDate } from "@/features/catalog/lib/pickup";
import { shop } from "@/features/catalog/seed";
import { useDemoNow, useDemoSelector } from "@/features/demo";
import {
  formatLabel,
  paymentLabel,
  progressLabel,
} from "@/features/orders/lib/labels";
import {
  dueDatesAtAcceptance,
  firstPaymentAmount,
  lineTotal,
  orderTotal,
} from "@/features/orders/lib/selectors";
import { formatMoney, formatShortDate } from "@/lib/format";
import { pickText } from "@/lib/localized";

export interface SentOrderView {
  id: string;
  ref: string;
  /** The same card C06 showed for this order, built from the stored order. */
  card: ReviewOrderView;
  progress: ShownLabel;
  payment: ShownLabel;
}

/**
 * C07 Request sent (AC25, R03): the orders just created, as the signed-in guest's own
 * orders (unknown or other guests' ids are dropped), in C06's card shape and wording so the
 * guest recognises them. Amounts and labels come from T0.
 */
export function useRequestSent(orderIds: string[]): {
  orders: SentOrderView[];
  /** Some text is shown in the other language (R02, AC30), as on C06. */
  languageNotice?: string;
} {
  const { t, language, intlLocale } = useLocale();
  const demoOrders = useDemoSelector((s) => s.data.orders);
  const pickupPlaces = useDemoSelector((s) => s.data.pickupPlaces);
  const products = useDemoSelector((s) => s.data.products);
  const signedInGuestId = useDemoSelector((s) => s.data.signedInGuestId);
  const now = useDemoNow();
  const today = zurichDate(now);
  const short = (iso: string) => formatShortDate(iso, today, intlLocale);
  const money = (rappen: number) => formatMoney(rappen / 100, intlLocale);
  const onlyIn = new Set<string>();
  const pick = (text: LocalizedText) => {
    const picked = pickText(text, language);

    if (picked.isFallback) onlyIn.add(picked.language);

    return picked.text;
  };
  const shown = (label: ReturnType<typeof progressLabel>): ShownLabel => ({
    text: formatLabel(label, t, intlLocale),
    tone: label.tone,
  });

  const orders = orderIds
    .map((id) => demoOrders.find((o) => o.id === id))
    .filter((o): o is Order => !!o && o.guestId === signedInGuestId);

  const rule = (order: Order) => {
    const policy = order.paymentPolicy;
    const total = orderTotal(order);
    const later = dueDatesAtAcceptance(order, now).balanceDueDate;

    if (policy.kind === "full")
      return t("checkout.rule.full", { hours: policy.firstDueHours });
    if (policy.kind === "deposit")
      return t("checkout.rule.deposit", {
        percent: policy.depositPercent,
        hours: policy.firstDueHours,
        balance: money(total - firstPaymentAmount(order)),
        date: short(later ?? order.pickupDate),
      });

    return t("checkout.rule.later", {
      amount: money(total),
      date: short(later ?? order.pickupDate),
    });
  };

  const card = (order: Order, index: number): ReviewOrderView => {
    const place = pickupPlaces.find((p) => p.id === order.pickupPlaceId);
    const policy = order.paymentPolicy;

    return {
      key: order.id,
      // "Order 1", "Order 2": the titles the guest just saw on C06.
      title: t("cart.order.title", { n: index + 1 }),
      policy:
        policy.kind === "deposit"
          ? t("cart.policy.deposit", { percent: policy.depositPercent })
          : t(`cart.policy.${policy.kind}`),
      items: order.lines.map((line) => {
        const product = products.find((p) => p.id === line.productId);

        return {
          id: line.id,
          name: pick(line.productName),
          photo: product?.photo,
          store: shop.name,
          // One-variant gifts carry a "Standard" label; it says nothing, so it is left out.
          option:
            (product?.variants.length ?? 0) > 1
              ? pickText(line.variantLabel, language).text
              : undefined,
          engraving: line.engraving
            ? t("cart.line.engraving", { text: line.engraving })
            : undefined,
          quantity: t("checkout.item.quantity", {
            quantity: line.quantity,
            price: money(line.unitPrice),
          }),
          total: money(lineTotal(line)),
        };
      }),
      requestDate: t("cart.line.requestDate", {
        date: short(order.pickupDate),
      }),
      place: place ? pickText(place.name, language).text : "",
      totalLabel: t("checkout.order.total"),
      total: money(orderTotal(order)),
      dueLabel: t("checkout.order.due"),
      due: money(firstPaymentAmount(order)),
      rule: rule(order),
      cancellationTitle: t("checkout.order.cancellation"),
      cancellation: pick(order.cancellationPolicy),
    };
  };

  const views = orders.map((order, index) => ({
    id: order.id,
    ref: order.ref,
    card: card(order, index),
    progress: shown(progressLabel(order)),
    payment: shown(paymentLabel(order, now)),
  }));

  return {
    languageNotice:
      onlyIn.size > 0
        ? t(
            onlyIn.has("en")
              ? "checkout.onlyInEnglish"
              : "checkout.onlyInGerman",
          )
        : undefined,
    orders: views,
  };
}
