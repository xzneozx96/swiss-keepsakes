import type {
  Actor,
  LogEvent,
  Order,
  OrderStatus,
  Payment,
  PaymentMethod,
  StaffId,
} from "../types";
import type { ShortLine } from "./selectors";
import type { Rappen } from "@/features/catalog/types";
import type { Language } from "@/contexts/locale-context";
import type { DemoState } from "@/features/demo/types";
import type { MailParams, MailTemplate } from "@/features/notifications/types";

import {
  amountDueNow,
  amountPaid,
  balance,
  dueDatesAtAcceptance,
  firstPaymentAmount,
  orderTotal,
  processingPayment,
  shortLines,
} from "./selectors";

import { sendMail } from "@/features/notifications/mail";
import { findDuplicatePayment } from "@/lib/payments";

/**
 * Order transitions (UX spec §2.1, §2.3). Each one is DemoState → DemoState and returns the
 * state unchanged when its guard blocks, so it is safe inside useDemo().update even if the
 * data moved since the screen rendered (last-item race). Screens call the matching guard
 * first to show the reason. Time and actor come in through the context, never a clock read.
 */
export interface TransitionContext<A extends Actor = Actor> {
  actor: A;
  /** Demo time (features/demo/clock.ts). */
  now: Date;
  /** Staff emails use the staff UI language (spec §6). */
  staffLanguage: Language;
}

export type StaffContext = TransitionContext<StaffId>;

export type OrderBlock =
  | { code: "wrong-status"; status: OrderStatus }
  | { code: "stock-short"; lines: ShortLine[] }
  | { code: "note-required" }
  | { code: "reason-required" }
  | { code: "payment-processing" }
  | { code: "nothing-due" }
  | { code: "invalid-amount" }
  | { code: "above-balance"; balance: Rappen }
  | { code: "duplicate"; payment: Payment }
  | { code: "not-handed-over" }
  | { code: "balance-owed"; balance: Rappen }
  | { code: "already-paid" };

export type CancelReason = "overdue" | "guest" | "merchant";
export type OfflineMethod = Exclude<PaymentMethod, "online">;

export interface OfflinePaymentInput {
  amount: Rappen;
  method: OfflineMethod;
  /** When the money was received; defaults to now on M08. */
  at: string;
  note?: string;
  /** Set after the staff member confirms the duplicate warning. */
  allowDuplicate?: boolean;
}

export type PickupChange =
  | { field: "date"; to: string; note: string }
  | { field: "place"; to: string; note: string };

// --- helpers ---------------------------------------------------------------

const findOrder = (state: DemoState, orderId: string): Order | undefined =>
  state.data.orders.find((o) => o.id === orderId);

function setOrder(state: DemoState, order: Order): DemoState {
  return {
    ...state,
    data: {
      ...state.data,
      orders: state.data.orders.map((o) => (o.id === order.id ? order : o)),
    },
  };
}

function logged(order: Order, event: LogEvent, ctx: TransitionContext): Order {
  return {
    ...order,
    log: [
      ...order.log,
      { ...event, at: ctx.now.toISOString(), actor: ctx.actor },
    ],
  };
}

function mailGuest(
  state: DemoState,
  order: Order,
  template: MailTemplate,
  params: MailParams,
  ctx: TransitionContext,
): DemoState {
  return sendMail(state, {
    at: ctx.now.toISOString(),
    to: "guest",
    guestId: order.guestId,
    language: order.language,
    template,
    orderId: order.id,
    params: { orderRef: order.ref, ...params },
  });
}

function mailStaff(
  state: DemoState,
  order: Order,
  template: MailTemplate,
  params: MailParams,
  ctx: TransitionContext,
): DemoState {
  return sendMail(state, {
    at: ctx.now.toISOString(),
    to: "staff",
    language: ctx.staffLanguage,
    template,
    orderId: order.id,
    params: { orderRef: order.ref, ...params },
  });
}

const statusIs = (
  order: Order,
  ...allowed: OrderStatus[]
): OrderBlock | null =>
  allowed.includes(order.status)
    ? null
    : { code: "wrong-status", status: order.status };

/** Once the first amount due is paid, an accepted order is confirmed (spec §2.1, system step). */
function confirmIfFirstPaid(order: Order): Order {
  return order.status === "accepted" && amountDueNow(order) === 0
    ? { ...order, status: "preparing" }
    : order;
}

/** Runs a guard, then applies the change only when the guard passes. */
function guarded(
  state: DemoState,
  orderId: string,
  guard: (state: DemoState, order: Order) => OrderBlock | null,
  apply: (order: Order) => DemoState,
): DemoState {
  const order = findOrder(state, orderId);

  return order && !guard(state, order) ? apply(order) : state;
}

// --- guards ----------------------------------------------------------------
// Each returns null when the action is allowed, or the reason it is not.

export function acceptBlock(state: DemoState, order: Order): OrderBlock | null {
  const short = shortLines(state.data, order);

  return (
    statusIs(order, "requested") ??
    (short.length ? { code: "stock-short", lines: short } : null)
  );
}

export function changePickupBlock(
  order: Order,
  change: PickupChange,
): OrderBlock | null {
  return (
    statusIs(order, "requested") ??
    (change.note.trim() ? null : { code: "note-required" })
  );
}

export function declineBlock(order: Order, reason: string): OrderBlock | null {
  return (
    statusIs(order, "requested") ??
    (reason.trim() ? null : { code: "reason-required" })
  );
}

export function startOnlinePaymentBlock(order: Order): OrderBlock | null {
  if (processingPayment(order)) return { code: "payment-processing" };

  return (
    statusIs(order, "accepted", "preparing", "ready", "handed_over") ??
    (amountDueNow(order) > 0 ? null : { code: "nothing-due" })
  );
}

/** Above-balance blocks outright; a duplicate only warns until the staff member confirms. */
export function recordOfflinePaymentBlock(
  order: Order,
  input: OfflinePaymentInput,
): OrderBlock | null {
  const status = statusIs(
    order,
    "accepted",
    "preparing",
    "ready",
    "handed_over",
  );

  if (status) return status;
  if (!(input.amount > 0)) return { code: "invalid-amount" };
  if (input.amount > balance(order))
    return { code: "above-balance", balance: balance(order) };

  const duplicate = findDuplicatePayment(
    order.payments,
    input.amount,
    input.at,
  );

  return duplicate && !input.allowDuplicate
    ? { code: "duplicate", payment: duplicate }
    : null;
}

export function markReadyBlock(order: Order): OrderBlock | null {
  return statusIs(order, "preparing");
}

export function handOverBlock(order: Order): OrderBlock | null {
  return statusIs(order, "ready");
}

/** Complete stays locked, with its reason, until the gift is handed over and fully paid (AC09). */
export function completeBlock(order: Order): OrderBlock | null {
  if (order.status === "ready") return { code: "not-handed-over" };

  return (
    statusIs(order, "handed_over") ??
    (balance(order) > 0
      ? { code: "balance-owed", balance: balance(order) }
      : null)
  );
}

/** The combined "Handed over and complete" button: ready and nothing owed. */
export function handOverAndCompleteBlock(order: Order): OrderBlock | null {
  return (
    statusIs(order, "ready") ??
    (balance(order) > 0
      ? { code: "balance-owed", balance: balance(order) }
      : null)
  );
}

/**
 * Guests cancel accepted orders before paying; the shop cancels until handover (refunds are
 * Phase 3); the system cancels accepted orders whose first payment is overdue (R05).
 */
export function cancelBlock(
  order: Order,
  reason: CancelReason,
): OrderBlock | null {
  if (reason === "merchant")
    return statusIs(order, "accepted", "preparing", "ready");

  const status = statusIs(order, "accepted");

  if (status) return status;
  if (amountPaid(order) > 0) return { code: "already-paid" };
  if (reason === "guest" && processingPayment(order))
    return { code: "payment-processing" };

  return null;
}

// --- transitions -------------------------------------------------------------

/** Requested → accepted (payment due) or preparing (pay later). Holds stock from now (O05). */
export function accept(
  state: DemoState,
  orderId: string,
  ctx: StaffContext,
): DemoState {
  return guarded(state, orderId, acceptBlock, (order) => {
    const dates = dueDatesAtAcceptance(order, ctx.now);
    const payLater = order.paymentPolicy.kind === "later";
    const next = logged(
      {
        ...order,
        ...dates,
        status: payLater ? "preparing" : "accepted",
        acceptedAt: ctx.now.toISOString(),
      },
      { type: "accepted" },
      ctx,
    );
    const params: MailParams = {
      pickupDate: next.pickupDate,
      pickupPlaceId: next.pickupPlaceId,
    };

    return payLater
      ? mailGuest(
          setOrder(state, next),
          next,
          "N05",
          {
            ...params,
            amount: orderTotal(next),
            dueDate: next.balanceDueDate ?? "",
          },
          ctx,
        )
      : mailGuest(
          setOrder(state, next),
          next,
          "N04",
          {
            ...params,
            amount: firstPaymentAmount(next),
            dueAt: next.firstPaymentDueAt ?? "",
          },
          ctx,
        );
  });
}

/** Staff change the requested date or place after agreeing with the guest by email (AC26). */
export function changePickup(
  state: DemoState,
  orderId: string,
  change: PickupChange,
  ctx: StaffContext,
): DemoState {
  return guarded(
    state,
    orderId,
    (_, order) => changePickupBlock(order, change),
    (order) => {
      const from =
        change.field === "date" ? order.pickupDate : order.pickupPlaceId;
      const moved: Order =
        change.field === "date"
          ? { ...order, pickupDate: change.to }
          : { ...order, pickupPlaceId: change.to };

      return setOrder(
        state,
        logged(
          moved,
          {
            type: "pickup-changed",
            field: change.field,
            from,
            to: change.to,
            note: change.note.trim(),
          },
          ctx,
        ),
      );
    },
  );
}

export function decline(
  state: DemoState,
  orderId: string,
  reason: string,
  ctx: StaffContext,
): DemoState {
  return guarded(
    state,
    orderId,
    (_, order) => declineBlock(order, reason),
    (order) => {
      const next = logged(
        { ...order, status: "declined" },
        { type: "declined", reason: reason.trim() },
        ctx,
      );

      return mailGuest(
        setOrder(state, next),
        next,
        "N06",
        { reason: reason.trim() },
        ctx,
      );
    },
  );
}

/** The guest opens the simulated provider (C12) for the amount due now; it starts as processing. */
export function startOnlinePayment(
  state: DemoState,
  orderId: string,
  ctx: TransitionContext<"guest">,
): DemoState {
  return guarded(
    state,
    orderId,
    (_, order) => startOnlinePaymentBlock(order),
    (order) => {
      const payment: Payment = {
        id: `pay-${order.id}-${order.payments.length + 1}`,
        amount: amountDueNow(order),
        method: "online",
        status: "processing",
        at: ctx.now.toISOString(),
      };

      return setOrder(
        state,
        logged(
          { ...order, payments: [...order.payments, payment] },
          { type: "payment", paymentId: payment.id },
          ctx,
        ),
      );
    },
  );
}

/**
 * The provider answers for the order's processing payment. Success confirms the order once the
 * first amount is paid (receipt N07, staff N21). A success that arrives after the order was
 * cancelled is kept for reconciliation and does not restore the order (S3, R05).
 */
export function resolveOnlinePayment(
  state: DemoState,
  orderId: string,
  outcome: "succeeded" | "failed",
  ctx: TransitionContext<"system">,
): DemoState {
  const order = findOrder(state, orderId);
  const pending = order && processingPayment(order);

  if (!order || !pending) return state;

  const at = ctx.now.toISOString();
  const resolved = logged(
    {
      ...order,
      payments: order.payments.map((p) =>
        p.id === pending.id ? { ...p, status: outcome, at } : p,
      ),
    },
    { type: "payment-result", paymentId: pending.id, status: outcome },
    ctx,
  );

  if (order.status === "cancelled") return setOrder(state, resolved);
  if (outcome === "failed")
    return mailGuest(
      setOrder(state, resolved),
      resolved,
      "N08",
      { amount: pending.amount },
      ctx,
    );

  const next = confirmIfFirstPaid(resolved);
  const params = { amount: pending.amount, balance: balance(next) };

  return mailStaff(
    mailGuest(setOrder(state, next), next, "N07", params, ctx),
    next,
    "N21",
    params,
    ctx,
  );
}

/** M08: money received outside the platform, recorded by Owner or Manager (AC08, AC29). */
export function recordOfflinePayment(
  state: DemoState,
  orderId: string,
  input: OfflinePaymentInput,
  ctx: StaffContext,
): DemoState {
  return guarded(
    state,
    orderId,
    (_, order) => recordOfflinePaymentBlock(order, input),
    (order) => {
      const payment: Payment = {
        id: `pay-${order.id}-${order.payments.length + 1}`,
        amount: input.amount,
        method: input.method,
        status: "succeeded",
        at: input.at,
        recordedBy: ctx.actor,
        note: input.note?.trim() || undefined,
      };
      const next = logged(
        { ...order, payments: [...order.payments, payment] },
        { type: "payment", paymentId: payment.id },
        ctx,
      );

      return setOrder(state, confirmIfFirstPaid(next));
    },
  );
}

export function markReady(
  state: DemoState,
  orderId: string,
  ctx: StaffContext,
): DemoState {
  return guarded(
    state,
    orderId,
    (_, order) => markReadyBlock(order),
    (order) => {
      const next = logged(
        { ...order, status: "ready" },
        { type: "ready" },
        ctx,
      );

      return mailGuest(
        setOrder(state, next),
        next,
        "N12",
        { pickupDate: next.pickupDate, pickupPlaceId: next.pickupPlaceId },
        ctx,
      );
    },
  );
}

/** Ready → handed over. The held units leave the shop, so on-hand stock goes down (O05). */
export function handOver(
  state: DemoState,
  orderId: string,
  ctx: StaffContext,
): DemoState {
  return guarded(
    state,
    orderId,
    (_, order) => handOverBlock(order),
    (order) => {
      const next = logged(
        { ...order, status: "handed_over" },
        { type: "handed-over" },
        ctx,
      );
      const products = state.data.products.map((p) => ({
        ...p,
        variants: p.variants.map((v) => {
          const units = order.lines
            .filter((l) => l.productId === p.id && l.variantId === v.id)
            .reduce((sum, l) => sum + l.quantity, 0);

          return units ? { ...v, stock: Math.max(0, v.stock - units) } : v;
        }),
      }));

      return setOrder({ ...state, data: { ...state.data, products } }, next);
    },
  );
}

/** Handed over and fully paid → completed. Commission is recorded once (AC10); review invite N15. */
export function complete(
  state: DemoState,
  orderId: string,
  ctx: StaffContext,
): DemoState {
  return guarded(
    state,
    orderId,
    (_, order) => completeBlock(order),
    (order) => {
      const at = ctx.now.toISOString();
      const next = logged(
        {
          ...order,
          status: "completed",
          completedAt: at,
          completedBy: ctx.actor,
          commissionRecordedAt: order.commissionRecordedAt ?? at,
        },
        { type: "completed" },
        ctx,
      );

      return mailGuest(setOrder(state, next), next, "N15", {}, ctx);
    },
  );
}

/** "Handed over and complete" for a ready order with nothing owed (spec §2.1). */
export function handOverAndComplete(
  state: DemoState,
  orderId: string,
  ctx: StaffContext,
): DemoState {
  return guarded(
    state,
    orderId,
    (_, order) => handOverAndCompleteBlock(order),
    () => complete(handOver(state, orderId, ctx), orderId, ctx),
  );
}

/** Cancelling releases held stock, because only accepted, preparing and ready orders hold it. */
export function cancel(
  state: DemoState,
  orderId: string,
  reason: CancelReason,
  ctx: TransitionContext,
): DemoState {
  return guarded(
    state,
    orderId,
    (_, order) => cancelBlock(order, reason),
    (order) => {
      const next = logged(
        { ...order, status: "cancelled" },
        { type: "cancelled", reason },
        ctx,
      );
      const cancelled = setOrder(state, next);

      if (reason !== "overdue") return cancelled;

      const params = { dueAt: next.firstPaymentDueAt ?? "" };

      return mailStaff(
        mailGuest(cancelled, next, "N23", params, ctx),
        next,
        "N23",
        params,
        ctx,
      );
    },
  );
}

/**
 * Prototype action "Expire this order's payment deadline": moves only this order's first-payment
 * deadline to now, and the system cancels it as overdue (R05). A processing payment does not
 * count as paid, so it does not stop the cancellation.
 */
export function expirePaymentDeadline(
  state: DemoState,
  orderId: string,
  ctx: TransitionContext<"system">,
): DemoState {
  return guarded(
    state,
    orderId,
    (_, order) => cancelBlock(order, "overdue"),
    (order) =>
      cancel(
        setOrder(state, { ...order, firstPaymentDueAt: ctx.now.toISOString() }),
        orderId,
        "overdue",
        ctx,
      ),
  );
}
