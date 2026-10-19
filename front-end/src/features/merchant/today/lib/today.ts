import type { OrderTabId } from "@/features/merchant/orders/lib/order-tabs";
import type { Rappen } from "@/features/catalog/types";
import type { Order, OrderStatus } from "@/features/orders/types";

import { zurichDate } from "@/features/catalog/lib/pickup";
import { orderTab } from "@/features/merchant/orders/lib/order-tabs";
import {
  balance,
  commission,
  isOverdue,
  orderTotal,
} from "@/features/orders/lib/selectors";
import { calendarDay } from "@/lib/format";

/** M02 task cards, in priority order (spec §3.2 M02; tours come in Phase 2). */
export const TODAY_TASKS = [
  "awaiting-confirmation",
  "awaiting-payment",
  "to-prepare",
  "ready",
  "overdue",
  "owing",
] as const;

export type TodayTaskId = (typeof TODAY_TASKS)[number];

export interface TodayTask {
  id: TodayTaskId;
  count: number;
  /** The M03 tab the card opens (`/store/orders?status=`). */
  tab: OrderTabId;
}

/**
 * The one task an order puts on M02, or none. Overdue wins over the order's stage, so no
 * order is counted twice.
 */
function taskOf(order: Order, now: Date): TodayTaskId | null {
  if (isOverdue(order, now)) return "overdue";
  switch (order.status) {
    case "requested":
      return "awaiting-confirmation";
    case "accepted":
      return "awaiting-payment";
    case "preparing":
      return "to-prepare";
    case "ready":
      return "ready";
    case "handed_over":
      return balance(order) > 0 ? "owing" : null;
    default:
      return null;
  }
}

const taskTab: Record<Exclude<TodayTaskId, "overdue">, OrderTabId> = {
  "awaiting-confirmation": "awaiting-confirmation",
  "awaiting-payment": "awaiting-payment",
  "to-prepare": "preparing",
  ready: "ready",
  owing: "owing",
};

/**
 * Task cards with at least one order. M03 has no overdue tab: that card opens the tab of
 * the overdue order with the soonest pickup (awaiting payment for a missed first payment).
 */
export function todayTasks(orders: Order[], now: Date): TodayTask[] {
  const byTask = new Map<TodayTaskId, Order[]>();

  for (const order of orders) {
    const task = taskOf(order, now);

    if (task) byTask.set(task, [...(byTask.get(task) ?? []), order]);
  }

  return TODAY_TASKS.flatMap((id): TodayTask[] => {
    const matching = byTask.get(id) ?? [];

    if (!matching.length) return [];
    if (id !== "overdue")
      return [{ id, count: matching.length, tab: taskTab[id] }];

    const [soonest] = [...matching].sort((a, b) =>
      a.pickupDate.localeCompare(b.pickupDate),
    );

    return [{ id, count: matching.length, tab: orderTab(soonest) }];
  });
}

/** Monday to Sunday of the Zurich week that contains `now`, as YYYY-MM-DD. */
export function zurichWeek(now: Date): { start: string; end: string } {
  const today = calendarDay(zurichDate(now));
  const fromMonday = (today.getUTCDay() + 6) % 7;
  const day = (offset: number) => {
    const d = new Date(today);

    d.setUTCDate(d.getUTCDate() + offset);

    return d.toISOString().slice(0, 10);
  };

  return { start: day(-fromMonday), end: day(6 - fromMonday) };
}

/** Statuses that owe money: accepted onwards, until handed over. Requests owe nothing yet (AC25). */
export const COLLECT_STATUSES = [
  "accepted",
  "preparing",
  "ready",
  "handed_over",
] as const satisfies readonly OrderStatus[];

export type CollectStatus = (typeof COLLECT_STATUSES)[number];

const owesMoney = (order: Order): order is Order & { status: CollectStatus } =>
  (COLLECT_STATUSES as readonly OrderStatus[]).includes(order.status);

export interface WeekCompleted {
  count: number;
  /** Order totals of the orders completed that week. */
  value: Rappen;
}

export interface TodayNumbers {
  /** Balance of every accepted order not yet paid in full; requests owe nothing yet. */
  toCollect: Rappen;
  /** The same balance split by status; the parts add up to `toCollect`. */
  toCollectBy: { status: CollectStatus; amount: Rappen; count: number }[];
  /** Recorded partner commission; payouts (M16) come in Phase 5, so none is paid yet. */
  commissionToPay: Rappen;
  /** Recorded commission per partner, largest first. */
  commissionBy: { partnerId: string; amount: Rappen }[];
  /** Commission that open orders (accepted onwards) will add once they complete. */
  commissionEstimated: Rappen;
  thisWeek: WeekCompleted;
  lastWeek: WeekCompleted;
  week: { start: string; end: string };
}

const DAY_MS = 86_400_000;

function completedIn(
  orders: Order[],
  week: { start: string; end: string },
): WeekCompleted {
  const done = orders.filter((o) => {
    if (o.status !== "completed" || !o.completedAt) return false;
    const day = zurichDate(new Date(o.completedAt));

    return day >= week.start && day <= week.end;
  });

  return {
    count: done.length,
    value: done.reduce((sum, o) => sum + orderTotal(o), 0),
  };
}

export function todayNumbers(orders: Order[], now: Date): TodayNumbers {
  const week = zurichWeek(now);
  const open = orders.filter(owesMoney);
  const recorded = new Map<string, Rappen>();

  for (const o of orders) {
    const c = commission(o);

    if (c.state === "recorded" && o.partnerId)
      recorded.set(o.partnerId, (recorded.get(o.partnerId) ?? 0) + c.total);
  }

  return {
    toCollect: open.reduce((sum, o) => sum + balance(o), 0),
    toCollectBy: COLLECT_STATUSES.map((status) => {
      const owing = open.filter((o) => o.status === status && balance(o) > 0);

      return {
        status,
        amount: owing.reduce((sum, o) => sum + balance(o), 0),
        count: owing.length,
      };
    }).filter((part) => part.amount > 0),
    commissionToPay: [...recorded.values()].reduce((sum, a) => sum + a, 0),
    commissionBy: [...recorded]
      .map(([partnerId, amount]) => ({ partnerId, amount }))
      .sort((a, b) => b.amount - a.amount),
    commissionEstimated: open
      .map(commission)
      .filter((c) => c.state === "estimated")
      .reduce((sum, c) => sum + c.total, 0),
    thisWeek: completedIn(orders, week),
    lastWeek: completedIn(
      orders,
      zurichWeek(new Date(now.getTime() - 7 * DAY_MS)),
    ),
    week,
  };
}

/** Orders being prepared or waiting at the pickup place, soonest pickup first (M02 next pickups). */
export function nextPickups(orders: Order[]): Order[] {
  return orders
    .filter((o) => o.status === "preparing" || o.status === "ready")
    .sort(
      (a, b) =>
        a.pickupDate.localeCompare(b.pickupDate) || a.ref.localeCompare(b.ref),
    );
}
