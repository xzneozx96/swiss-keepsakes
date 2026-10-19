import type { Order, StaffId } from "../types";
import type { OrderBlock, TransitionContext } from "../lib/transitions";
import type { DemoState } from "@/features/demo/types";
import type { StatusTone } from "@/components/status-chip";

import {
  blockLabel,
  commissionLabel,
  formatLabel,
  paymentLabel,
  progressLabel,
} from "../lib/labels";
import {
  amountDueNow,
  amountPaid,
  balance,
  commission,
  orderTotal,
  processingPayment,
} from "../lib/selectors";
import * as tr from "../lib/transitions";

import { useLocale } from "@/contexts/locale-context";
import { useDemo, useDemoNow, useDemoSelector } from "@/features/demo";
import { demoNow } from "@/features/demo/clock";
import { allOrders } from "@/features/partners/lib/ledger";

export interface ShownLabel {
  text: string;
  tone: StatusTone;
}

/**
 * Order actions bound to the demo store. Each returns null when it ran, or the reason it is
 * blocked (formatted with `useBlockText`). The guard runs on the screen's state first; the
 * transition re-checks on the latest state inside `update`, so a race leaves data unchanged.
 */
export function useOrderActions() {
  const { state, update } = useDemo();
  const { language } = useLocale();
  const staff: StaffId = state.role === "owner" ? "owner" : "manager";

  function run<A extends TransitionContext["actor"]>(
    orderId: string,
    actor: A,
    guard: (state: DemoState, order: Order) => OrderBlock | null,
    apply: (state: DemoState, ctx: TransitionContext<A>) => DemoState,
  ): OrderBlock | null {
    const order = state.data.orders.find((o) => o.id === orderId);
    const block = order ? guard(state, order) : null;

    if (!order || block) return block;

    update((s) =>
      apply(s, {
        actor,
        now: demoNow(s.clockStartedAt),
        staffLanguage: language,
      }),
    );

    return null;
  }

  return {
    accept: (id: string) =>
      run(id, staff, tr.acceptBlock, (s, ctx) => tr.accept(s, id, ctx)),
    changePickup: (id: string, change: tr.PickupChange) =>
      run(
        id,
        staff,
        (_, o) => tr.changePickupBlock(o, change),
        (s, ctx) => tr.changePickup(s, id, change, ctx),
      ),
    decline: (id: string, reason: string) =>
      run(
        id,
        staff,
        (_, o) => tr.declineBlock(o, reason),
        (s, ctx) => tr.decline(s, id, reason, ctx),
      ),
    /** C12 simulated provider: Pay, Fail, or Processing (left open until resolved). */
    payOnline: (id: string, outcome: "succeeded" | "failed" | "processing") =>
      run(
        id,
        "guest",
        (_, o) => tr.startOnlinePaymentBlock(o),
        (s, ctx) => {
          const started = tr.startOnlinePayment(s, id, ctx);

          return outcome === "processing"
            ? started
            : tr.resolveOnlinePayment(started, id, outcome, {
                ...ctx,
                actor: "system",
              });
        },
      ),
    /** Prototype action: the provider answers a processing payment (possibly after cancellation). */
    resolveOnlinePayment: (id: string, outcome: "succeeded" | "failed") =>
      run(
        id,
        "system",
        (_, o) => (processingPayment(o) ? null : { code: "nothing-due" }),
        (s, ctx) => tr.resolveOnlinePayment(s, id, outcome, ctx),
      ),
    recordOfflinePayment: (id: string, input: tr.OfflinePaymentInput) =>
      run(
        id,
        staff,
        (_, o) => tr.recordOfflinePaymentBlock(o, input),
        (s, ctx) => tr.recordOfflinePayment(s, id, input, ctx),
      ),
    markReady: (id: string) =>
      run(
        id,
        staff,
        (_, o) => tr.markReadyBlock(o),
        (s, ctx) => tr.markReady(s, id, ctx),
      ),
    handOver: (id: string) =>
      run(
        id,
        staff,
        (_, o) => tr.handOverBlock(o),
        (s, ctx) => tr.handOver(s, id, ctx),
      ),
    complete: (id: string) =>
      run(
        id,
        staff,
        (_, o) => tr.completeBlock(o),
        (s, ctx) => tr.complete(s, id, ctx),
      ),
    handOverAndComplete: (id: string) =>
      run(
        id,
        staff,
        (_, o) => tr.handOverAndCompleteBlock(o),
        (s, ctx) => tr.handOverAndComplete(s, id, ctx),
      ),
    cancelByGuest: (id: string) =>
      run(
        id,
        "guest",
        (_, o) => tr.cancelBlock(o, "guest"),
        (s, ctx) => tr.cancel(s, id, "guest", ctx),
      ),
    cancelByMerchant: (id: string) =>
      run(
        id,
        staff,
        (_, o) => tr.cancelBlock(o, "merchant"),
        (s, ctx) => tr.cancel(s, id, "merchant", ctx),
      ),
    /** Prototype bar: "Expire this order's payment deadline". */
    expirePaymentDeadline: (id: string) =>
      run(
        id,
        "system",
        (_, o) => tr.cancelBlock(o, "overdue"),
        (s, ctx) => tr.expirePaymentDeadline(s, id, ctx),
      ),
  };
}

/** Turns a block from `useOrderActions` into the sentence a screen shows. */
export function useBlockText() {
  const { t, language, intlLocale } = useLocale();

  return (block: OrderBlock): ShownLabel => {
    const label = blockLabel(block, language);

    return { text: formatLabel(label, t, intlLocale), tone: label.tone };
  };
}

/** Amounts and both labels of one order, in the current language and demo time. */
export function useOrderSummary(
  order: Order,
  audience: "guest" | "staff" = "guest",
) {
  const { t, intlLocale } = useLocale();
  const now = useDemoNow();
  const shown = (label: ReturnType<typeof progressLabel>): ShownLabel => ({
    text: formatLabel(label, t, intlLocale),
    tone: label.tone,
  });
  const fees = commission(order);

  return {
    total: orderTotal(order),
    paid: amountPaid(order),
    balance: balance(order),
    dueNow: amountDueNow(order),
    isProcessing: !!processingPayment(order),
    progress: shown(progressLabel(order, audience)),
    payment: shown(paymentLabel(order, now)),
    commission: { ...fees, label: shown(commissionLabel(fees.state)) },
  };
}

/** M04: any order of the shop, the generated history included (outline D15). */
export function useOrder(orderId: string): Order | undefined {
  const data = useDemoSelector((s) => s.data);

  return allOrders(data).find((o) => o.id === orderId);
}

/** The signed-in guest's orders, newest first (C14). */
export function useGuestOrders(): Order[] {
  const guestId = useDemoSelector((s) => s.data.signedInGuestId);
  const orders = useDemoSelector((s) => s.data.orders);

  return orders
    .filter((o) => o.guestId === guestId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
