import type { Order, OrderLine, Payment } from "../types";
import type { LocalizedText, Rappen } from "@/features/catalog/types";
import type { DemoData } from "@/features/demo/types";

import { zurichDate } from "@/features/catalog/lib/pickup";
import { availableUnits } from "@/features/catalog/lib/stock";

const HOUR_MS = 3_600_000;

export const lineTotal = (line: OrderLine): Rappen =>
  line.unitPrice * line.quantity;

export const orderTotal = (order: Order): Rappen =>
  order.lines.reduce((sum, l) => sum + lineTotal(l), 0);

/** Online payments count only once the provider confirms them (spec §2.3). */
export const amountPaid = (order: Order): Rappen =>
  order.payments
    .filter((p) => p.status === "succeeded")
    .reduce((sum, p) => sum + p.amount, 0);

const isClosed = (order: Order) =>
  order.status === "declined" || order.status === "cancelled";

/** What the guest still owes. Declined and cancelled orders owe nothing. */
export const balance = (order: Order): Rappen =>
  isClosed(order) ? 0 : Math.max(0, orderTotal(order) - amountPaid(order));

/** The amount due once the seller accepts: full total, the deposit, or nothing (pay later). */
export function firstPaymentAmount(order: Order): Rappen {
  const policy = order.paymentPolicy;

  if (policy.kind === "full") return orderTotal(order);
  if (policy.kind === "deposit")
    return Math.round((orderTotal(order) * policy.depositPercent) / 100);

  return 0;
}

export const processingPayment = (order: Order): Payment | undefined =>
  order.payments.find((p) => p.status === "processing");

/** What the Pay button pays now: the rest of the first payment while accepted, else the balance. */
export function amountDueNow(order: Order): Rappen {
  switch (order.status) {
    case "accepted":
      return Math.max(0, firstPaymentAmount(order) - amountPaid(order));
    case "preparing":
    case "ready":
    case "handed_over":
      return balance(order);
    default:
      return 0;
  }
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);

  d.setUTCDate(d.getUTCDate() + days);

  return d.toISOString().slice(0, 10);
}

/**
 * Deadlines fixed when the seller accepts: the first payment 24 hours later (D8, from the
 * policy), the deposit balance and pay-later amounts a set number of days after pickup.
 */
export function dueDatesAtAcceptance(
  order: Order,
  acceptedAt: Date,
): Pick<Order, "firstPaymentDueAt" | "balanceDueDate"> {
  const policy = order.paymentPolicy;

  if (policy.kind === "later")
    return {
      balanceDueDate: addDays(order.pickupDate, policy.dueDaysAfterPickup),
    };

  const firstPaymentDueAt = new Date(
    acceptedAt.getTime() + policy.firstDueHours * HOUR_MS,
  ).toISOString();

  return policy.kind === "deposit"
    ? {
        firstPaymentDueAt,
        balanceDueDate: addDays(
          order.pickupDate,
          policy.balanceDueDaysAfterPickup,
        ),
      }
    : { firstPaymentDueAt };
}

/** True when the amount due now has passed its deadline. */
export function isOverdue(order: Order, now: Date): boolean {
  if (amountDueNow(order) === 0) return false;
  if (order.status === "accepted")
    return (
      !!order.firstPaymentDueAt &&
      Date.parse(order.firstPaymentDueAt) < now.getTime()
    );

  return !!order.balanceDueDate && zurichDate(now) > order.balanceDueDate;
}

const cancelledAt = (order: Order): string | undefined =>
  [...order.log].reverse().find((e) => e.type === "cancelled")?.at;

/** Money the provider confirmed after the order was cancelled: shown for reconciliation (S3, R05). */
export function paymentsAfterCancellation(order: Order): Payment[] {
  const at = cancelledAt(order);

  if (order.status !== "cancelled" || !at) return [];

  return order.payments.filter(
    (p) => p.status === "succeeded" && Date.parse(p.at) > Date.parse(at),
  );
}

/** The seller changed the requested date or place (R04 free-cancel note on C14/C15). */
export const pickupChangedBySeller = (order: Order): boolean =>
  order.log.some((e) => e.type === "pickup-changed");

/**
 * Partner commission (spec §2.4): basis = price × quantity per line, at the rate stored on
 * the line. "none" when there is no partner; "not-applicable" when declined or cancelled.
 */
export type CommissionState =
  "none" | "estimated" | "recorded" | "not-applicable";

export interface Commission {
  state: CommissionState;
  lines: { lineId: string; basis: Rappen; rate: number; amount: Rappen }[];
  total: Rappen;
}

export function commission(order: Order): Commission {
  const lines = order.lines.map((l) => ({
    lineId: l.id,
    basis: lineTotal(l),
    rate: l.commissionRate,
    amount: Math.round(lineTotal(l) * l.commissionRate),
  }));
  const state: CommissionState = !order.partnerId
    ? "none"
    : order.commissionRecordedAt
      ? "recorded"
      : isClosed(order)
        ? "not-applicable"
        : "estimated";

  return { state, lines, total: lines.reduce((sum, l) => sum + l.amount, 0) };
}

/** Units of a variant still free: on-hand stock minus units held by accepted orders (AC05, O05). */
export function variantAvailable(
  data: Pick<DemoData, "products" | "orders">,
  productId: string,
  variantId: string,
): number {
  const product = data.products.find((p) => p.id === productId);
  const variant = product?.variants.find((v) => v.id === variantId);

  return product && variant ? availableUnits(product, variant, data.orders) : 0;
}

export interface ShortLine {
  productId: string;
  variantId: string;
  productName: LocalizedText;
  variantLabel: LocalizedText;
  requested: number;
  available: number;
}

/** Variants this order needs more of than are free; empty when the order can be accepted. */
export function shortLines(
  data: Pick<DemoData, "products" | "orders">,
  order: Order,
): ShortLine[] {
  const needs = new Map<string, ShortLine>();

  for (const l of order.lines) {
    const key = `${l.productId}/${l.variantId}`;
    const need = needs.get(key);

    if (need) need.requested += l.quantity;
    else
      needs.set(key, {
        productId: l.productId,
        variantId: l.variantId,
        productName: l.productName,
        variantLabel: l.variantLabel,
        requested: l.quantity,
        available: variantAvailable(data, l.productId, l.variantId),
      });
  }

  return [...needs.values()].filter((n) => n.requested > n.available);
}
