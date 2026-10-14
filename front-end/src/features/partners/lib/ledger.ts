import type {
  CommissionAdjustment,
  PartnerPayout,
  TransactionRef,
} from "../types";
import type { Rappen } from "@/features/catalog/types";
import type { DemoData } from "@/features/demo/types";
import type { CommissionState } from "@/features/orders/lib/selectors";
import type { Order } from "@/features/orders/types";

import { DEMO_HISTORY } from "@/features/merchant/today/lib/demo-history";
import { commission } from "@/features/orders/lib/selectors";
import { bookingCommission } from "@/features/tours/lib/selectors";

/**
 * Every order the shop has, as one source (outline D14): the generated M02 history and the
 * demo orders, as M02 and P02 already combine them; no history while the demo has no orders.
 */
export function allOrders(data: Pick<DemoData, "orders">): Order[] {
  return data.orders.length ? [...DEMO_HISTORY, ...data.orders] : [];
}

export const transactionKey = (t: TransactionRef) => `${t.kind}:${t.id}`;

/** One transaction's commission for its partner, with refunds applied (spec §2.4). */
export interface CommissionItem {
  transaction: TransactionRef;
  ref: string;
  partnerId: string;
  guestId: string;
  createdAt: string;
  /** Commission at the rate of booking, before refunds. */
  amount: Rappen;
  /** Commission removed by refunds. */
  adjusted: Rappen;
  /** Set once the transaction completed (AC10). */
  recordedAt: string | null;
  state: Exclude<CommissionState, "none"> | "adjusted";
}

export function commissionItems(
  data: Pick<DemoData, "orders" | "tours" | "commissionAdjustments">,
  partnerId: string,
): CommissionItem[] {
  const adjustedBy = new Map<string, Rappen>();

  for (const a of data.commissionAdjustments) {
    if (a.partnerId !== partnerId) continue;
    const key = transactionKey(a.transaction);

    adjustedBy.set(key, (adjustedBy.get(key) ?? 0) + a.commission);
  }

  const item = (
    transaction: TransactionRef,
    base: Omit<CommissionItem, "transaction" | "adjusted" | "state"> & {
      state: CommissionState;
    },
  ): CommissionItem => {
    const adjusted = adjustedBy.get(transactionKey(transaction)) ?? 0;
    const state = base.state === "none" ? "not-applicable" : base.state;

    return {
      ...base,
      transaction,
      adjusted,
      state: adjusted > 0 && state === "recorded" ? "adjusted" : state,
    };
  };

  const orders = allOrders(data)
    .filter((o) => o.partnerId === partnerId)
    .map((o) => {
      const c = commission(o);

      return item(
        { kind: "order", id: o.id },
        {
          ref: o.ref,
          partnerId,
          guestId: o.guestId,
          createdAt: o.createdAt,
          amount: c.total,
          recordedAt: o.commissionRecordedAt ?? null,
          state: c.state,
        },
      );
    });
  // Holds that never became a booking are not the partner's transactions (R15).
  const bookings = (data.tours?.bookings ?? [])
    .filter(
      (b) =>
        b.partnerId === partnerId &&
        b.status !== "pending_payment" &&
        b.status !== "expired",
    )
    .map((b) => {
      const c = bookingCommission(b);

      return item(
        { kind: "booking", id: b.id },
        {
          ref: b.ref,
          partnerId,
          guestId: b.guestId,
          createdAt: b.createdAt,
          amount: c.amount,
          recordedAt: b.commissionRecordedAt,
          state: c.state,
        },
      );
    });

  return [...orders, ...bookings].sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
  );
}

export type LedgerEntry = {
  at: string;
  /** Still to pay and still to offset right after this entry. */
  toPay: Rappen;
  toOffset: Rappen;
} & (
  | { type: "recorded"; item: CommissionItem; amount: Rappen }
  | { type: "adjustment"; adjustment: CommissionAdjustment }
  | { type: "payout"; payout: PartnerPayout }
  /** Part of an overpayment applied to a later recorded commission; never new money. */
  | { type: "offset"; item: CommissionItem; amount: Rappen }
);

export interface PartnerLedger {
  items: CommissionItem[];
  /** Oldest first. */
  entries: LedgerEntry[];
  /** Recorded commission after refund adjustments. */
  earned: Rappen;
  paid: Rappen;
  offset: Rappen;
  toPay: Rappen;
  toOffset: Rappen;
  /** Commission on open transactions, not recorded yet. */
  estimated: Rappen;
  /** Settled so far, per transaction key: money paid covers recorded commission net of refunds, oldest first (D13). */
  settled: Map<string, Rappen>;
}

/**
 * Payouts are recorded by day and sort at noon Zurich time, but never after the moment they
 * were recorded: a payout entered this morning counts at once.
 */
const payoutAt = (p: PartnerPayout) =>
  new Date(
    Math.min(
      Date.parse(`${p.paidOn}T12:00:00+02:00`),
      Date.parse(p.recordedAt),
    ),
  ).toISOString();

/**
 * The partner's commission ledger (O08, AC13). A refund first lowers what is still to pay;
 * anything already paid beyond that becomes an overpayment, which the next recorded
 * commissions offset, oldest first. Offsets never count as money paid. Recorded commission,
 * refunds and payouts are past facts by construction, so they are never cut off at `now`:
 * `useDemoNow()` ticks every 30 s, and a cut-off hid a payout just recorded. `now` only
 * limits the estimate on open transactions.
 */
export function partnerLedger(
  data: Pick<
    DemoData,
    "orders" | "tours" | "commissionAdjustments" | "partnerPayouts"
  >,
  partnerId: string,
  now: Date,
): PartnerLedger {
  const items = commissionItems(data, partnerId);
  const before = (at: string) => Date.parse(at) <= now.getTime();

  type Event =
    | { at: string; type: "recorded"; item: CommissionItem }
    | { at: string; type: "adjustment"; adjustment: CommissionAdjustment }
    | { at: string; type: "payout"; payout: PartnerPayout };
  const events: Event[] = [
    ...items
      .filter((i) => i.recordedAt)
      .map((item) => ({
        at: item.recordedAt as string,
        type: "recorded" as const,
        item,
      })),
    ...data.commissionAdjustments
      .filter((a) => a.partnerId === partnerId)
      .map((adjustment) => ({
        at: adjustment.at,
        type: "adjustment" as const,
        adjustment,
      })),
    ...data.partnerPayouts
      .filter((p) => p.partnerId === partnerId)
      .map((payout) => ({
        at: payoutAt(payout),
        type: "payout" as const,
        payout,
      })),
  ].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));

  const entries: LedgerEntry[] = [];
  let owed = 0;
  let credit = 0;
  let earned = 0;
  let paid = 0;
  let offset = 0;

  for (const e of events) {
    if (e.type === "recorded") {
      earned += e.item.amount;
      owed += e.item.amount;
      entries.push({
        ...e,
        amount: e.item.amount,
        toPay: owed,
        toOffset: credit,
      });
      const applied = Math.min(credit, e.item.amount);

      owed -= applied;
      credit -= applied;
      if (applied > 0) {
        offset += applied;
        entries.push({
          at: e.at,
          type: "offset",
          item: e.item,
          amount: applied,
          toPay: owed,
          toOffset: credit,
        });
      }
      continue;
    }

    if (e.type === "adjustment") {
      earned -= e.adjustment.commission;
      owed -= e.adjustment.commission;
    } else {
      paid += e.payout.amount;
      owed -= e.payout.amount;
    }
    if (owed < 0) {
      credit -= owed;
      owed = 0;
    }
    entries.push({ ...e, toPay: owed, toOffset: credit });
  }

  // Money paid settles recorded commission, net of refunds, oldest first. An offset is the
  // overpaid part of that same money moving to a later commission, so it adds nothing here.
  const settled = new Map<string, Rappen>();
  let pool = paid;

  for (const i of items
    .filter((x) => x.recordedAt)
    .sort(
      (a, b) => Date.parse(a.recordedAt ?? "") - Date.parse(b.recordedAt ?? ""),
    )) {
    const net = Math.max(0, i.amount - i.adjusted);
    const share = Math.min(pool, net);

    settled.set(transactionKey(i.transaction), share);
    pool -= share;
  }

  return {
    items,
    entries,
    earned,
    paid,
    offset,
    toPay: owed,
    toOffset: credit,
    estimated: items
      .filter((i) => i.state === "estimated" && before(i.createdAt))
      .reduce((sum, i) => sum + i.amount, 0),
    settled,
  };
}
