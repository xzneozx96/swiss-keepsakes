import type { CategoryId, Product, Rappen } from "@/features/catalog/types";
import type { Order, PaymentMethod } from "@/features/orders/types";

import { zurichDate } from "@/features/catalog/lib/pickup";
import {
  amountPaid,
  commission,
  lineTotal,
  orderTotal,
} from "@/features/orders/lib/selectors";

/** The Overview analytics periods. "month" runs from the 1st to today. */
export const PERIODS = ["7d", "30d", "month"] as const;
export type PeriodId = (typeof PERIODS)[number];

/** Inclusive Zurich calendar days, YYYY-MM-DD. */
export interface DayRange {
  start: string;
  end: string;
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);

  d.setUTCDate(d.getUTCDate() + days);

  return d.toISOString().slice(0, 10);
}

function daysOf(range: DayRange): string[] {
  const days: string[] = [];

  for (let d = range.start; d <= range.end; d = addDays(d, 1)) days.push(d);

  return days;
}

/** The period that ends today and the one before it, the same length (month: same days). */
export function periodRanges(
  period: PeriodId,
  today: string,
): { current: DayRange; previous: DayRange } {
  if (period === "month") {
    const start = `${today.slice(0, 8)}01`;
    const prevStart = `${addDays(start, -1).slice(0, 8)}01`;
    const prevMonthEnd = addDays(start, -1);
    const sameDay = `${prevStart.slice(0, 8)}${today.slice(8)}`;

    return {
      current: { start, end: today },
      previous: {
        start: prevStart,
        end: sameDay < prevMonthEnd ? sameDay : prevMonthEnd,
      },
    };
  }
  const length = period === "7d" ? 7 : 30;

  return {
    current: { start: addDays(today, 1 - length), end: today },
    previous: {
      start: addDays(today, 1 - 2 * length),
      end: addDays(today, -length),
    },
  };
}

// zurichDate builds an Intl formatter per call; the history asks for the same instants often.
const dayCache = new Map<string, string>();
const dayOf = (iso: string) => {
  let day = dayCache.get(iso);

  if (!day) {
    day = zurichDate(new Date(iso));
    dayCache.set(iso, day);
  }

  return day;
};
const within = (day: string, range: DayRange) =>
  day >= range.start && day <= range.end;
const isLost = (o: Order) =>
  o.status === "declined" || o.status === "cancelled";

const closedAt = (o: Order): string | undefined =>
  o.completedAt ?? [...o.log].reverse().find((e) => e.type === "cancelled")?.at;

/**
 * Still to collect at the end of a day: accepted by then, not closed by then, minus the
 * payments made by then. For today this equals T0 `balance` on every open order.
 */
function owedAtEndOf(o: Order, day: string): Rappen {
  if (!o.acceptedAt || dayOf(o.acceptedAt) > day) return 0;
  const closed = closedAt(o);

  if (closed && dayOf(closed) <= day) return 0;
  const paid = o.payments
    .filter((p) => p.status === "succeeded" && dayOf(p.at) <= day)
    .reduce((sum, p) => sum + p.amount, 0);

  return Math.max(0, orderTotal(o) - paid);
}

export const KPIS = [
  "accepted",
  "requested",
  "collected",
  "toCollect",
  "commission",
  "orders",
  "average",
] as const;
export type KpiId = (typeof KPIS)[number];

export interface DayPoint {
  day: string;
  /** Value of orders requested that day (all statuses). */
  requested: Rappen;
  /** Value of orders accepted that day and not cancelled since. */
  accepted: Rappen;
  /** Confirmed payments received that day. */
  collected: Rappen;
  /** Still to collect at the end of the day. */
  toCollect: Rappen;
  /** Partner commission recorded that day (orders completed). */
  commission: Rappen;
  /** Orders requested that day. */
  orders: number;
  /** Average value of the orders requested that day; null on a day with none. */
  average: Rappen | null;
}

function dayPoints(orders: Order[], range: DayRange): DayPoint[] {
  const points = new Map<string, DayPoint>(
    daysOf(range).map((day) => [
      day,
      {
        day,
        requested: 0,
        accepted: 0,
        collected: 0,
        toCollect: 0,
        commission: 0,
        orders: 0,
        average: null,
      },
    ]),
  );
  const at = (iso: string | undefined) =>
    iso ? points.get(dayOf(iso)) : undefined;

  for (const o of orders) {
    const created = at(o.createdAt);

    if (created) {
      created.requested += orderTotal(o);
      created.orders += 1;
    }
    const accepted = o.status === "cancelled" ? undefined : at(o.acceptedAt);

    if (accepted) accepted.accepted += orderTotal(o);
    for (const p of o.payments) {
      const paid = p.status === "succeeded" ? at(p.at) : undefined;

      if (paid) paid.collected += p.amount;
    }
    const fees = commission(o);
    const recorded =
      fees.state === "recorded" ? at(o.commissionRecordedAt) : undefined;

    if (recorded) recorded.commission += fees.total;
  }
  for (const point of points.values()) {
    point.toCollect = orders.reduce(
      (sum, o) => sum + owedAtEndOf(o, point.day),
      0,
    );
    point.average = point.orders
      ? Math.round(point.requested / point.orders)
      : null;
  }

  return [...points.values()];
}

/** Period total of a KPI: flows add up; still to collect is the level on the last day. */
function total(points: DayPoint[], id: KpiId): number {
  if (id === "toCollect") return points[points.length - 1]?.toCollect ?? 0;
  if (id === "average") {
    const orders = total(points, "orders");

    return orders ? Math.round(total(points, "requested") / orders) : 0;
  }

  return points.reduce((sum, p) => sum + p[id], 0);
}

export interface Kpi {
  id: KpiId;
  value: number;
  previous: number;
  /** One value per day for the sparkline (average: null on days without orders). */
  trend: (number | null)[];
}

export const FUNNEL_STEPS = [
  "requested",
  "accepted",
  "paid",
  "completed",
] as const;
export const LOST_STEPS = ["declined", "cancelled"] as const;
export type FunnelStep =
  (typeof FUNNEL_STEPS)[number] | (typeof LOST_STEPS)[number];

export interface Analytics {
  current: DayRange;
  previous: DayRange;
  days: DayPoint[];
  kpis: Kpi[];
  /** Orders requested in the period, by how far they got (a cohort, not events). */
  funnel: { step: FunnelStep; count: number }[];
  /** Value of the period's orders that were not declined or cancelled, by product group. */
  groups: { id: CategoryId; value: Rappen; orders: number }[];
  /** Confirmed payments received in the period, by method. */
  methods: { method: PaymentMethod; amount: Rappen; count: number }[];
  /** The period's orders that were not declined or cancelled, by pickup place. */
  places: { id: string; value: Rappen; orders: number }[];
  /** No orders and no payments in the period. */
  isEmpty: boolean;
}

function grouped<K extends string>(
  entries: { key: K; value: number }[],
): { id: K; value: number; orders: number }[] {
  const map = new Map<K, { id: K; value: number; orders: number }>();

  for (const { key, value } of entries) {
    const row = map.get(key) ?? { id: key, value: 0, orders: 0 };

    row.value += value;
    row.orders += 1;
    map.set(key, row);
  }

  return [...map.values()].sort((a, b) => b.value - a.value);
}

export function overviewAnalytics(
  orders: readonly Order[],
  products: readonly Product[],
  period: PeriodId,
  today: string,
): Analytics {
  const list = [...orders];
  const { current, previous } = periodRanges(period, today);
  const days = dayPoints(list, current);
  const before = dayPoints(list, previous);
  const created = list.filter((o) => within(dayOf(o.createdAt), current));
  const kept = created.filter((o) => !isLost(o));
  const categoryOf = new Map(products.map((p) => [p.id, p.categoryId]));
  const payments = list.flatMap((o) =>
    o.payments.filter(
      (p) => p.status === "succeeded" && within(dayOf(p.at), current),
    ),
  );
  const methods = new Map<PaymentMethod, { amount: Rappen; count: number }>();

  for (const p of payments) {
    const row = methods.get(p.method) ?? { amount: 0, count: 0 };

    methods.set(p.method, {
      amount: row.amount + p.amount,
      count: row.count + 1,
    });
  }

  return {
    current,
    previous,
    days,
    kpis: KPIS.map((id) => ({
      id,
      value: total(days, id),
      previous: total(before, id),
      trend: days.map((d) => d[id]),
    })),
    funnel: [
      { step: "requested", count: created.length },
      { step: "accepted", count: created.filter((o) => o.acceptedAt).length },
      { step: "paid", count: created.filter((o) => amountPaid(o) > 0).length },
      {
        step: "completed",
        count: created.filter((o) => o.status === "completed").length,
      },
      {
        step: "declined",
        count: created.filter((o) => o.status === "declined").length,
      },
      {
        step: "cancelled",
        count: created.filter((o) => o.status === "cancelled").length,
      },
    ],
    groups: grouped(
      kept.flatMap((o) =>
        o.lines.map((l) => ({
          key: categoryOf.get(l.productId) ?? ("small-gifts" as CategoryId),
          value: lineTotal(l),
        })),
      ),
    ),
    methods: [...methods.entries()]
      .map(([method, row]) => ({ method, ...row }))
      .sort((a, b) => b.amount - a.amount),
    places: grouped(
      kept.map((o) => ({ key: o.pickupPlaceId, value: orderTotal(o) })),
    ),
    isEmpty: created.length === 0 && payments.length === 0,
  };
}

export type DeltaTone = "good" | "bad" | "neutral";
export type Polarity = "up" | "down" | "neutral";

/**
 * A change against the previous period, as the stat cards show it: "+12%", "−4%", "±0%",
 * or "" when the previous value is 0 (never ∞). The tone is direction × polarity.
 */
export function deltaOf(
  value: number,
  previous: number,
  polarity: Polarity,
  locale: string,
): {
  delta: string;
  direction: "up" | "down" | "flat" | "none";
  tone: DeltaTone;
} {
  const change = previous ? (value - previous) / previous : null;
  const rounded = change === null ? null : Math.round(change * 100);
  const direction =
    rounded === null
      ? "none"
      : rounded > 0
        ? "up"
        : rounded < 0
          ? "down"
          : "flat";
  const tone: DeltaTone =
    direction === "up" || direction === "down"
      ? polarity === "neutral"
        ? "neutral"
        : (direction === "up") === (polarity === "up")
          ? "good"
          : "bad"
      : "neutral";
  const delta =
    change === null
      ? ""
      : new Intl.NumberFormat(locale, {
          style: "percent",
          signDisplay: "exceptZero",
        })
          .format(Math.round(change * 100) / 100)
          .replace("-", "−");

  return { delta, direction, tone };
}

/** Monday of the week that contains `day` (YYYY-MM-DD). */
export function mondayOf(day: string): string {
  const fromMonday = (new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7;

  return addDays(day, -fromMonday);
}

export const ALL_TIME_WEEKS = 7;

export interface AllTime {
  /** Zurich day of the first order. */
  firstDay: string;
  /** Every confirmed payment since the first order. */
  collected: Rappen;
  /** Collected in the last 30 days and the 30 before: the 30-day Collected KPI and its base. */
  last30: Rappen;
  previous30: Rappen;
  previousRange: DayRange;
  requested: Rappen;
  /** Accepted and not cancelled since, as the Revenue accepted KPI. */
  accepted: Rappen;
  commissionRecorded: Rappen;
  /** Commission still estimated on open orders. */
  commissionEstimated: Rappen;
  orders: number;
  completed: number;
  /** Collected per Monday-to-Sunday week, oldest first; the last week is the running one. */
  weeks: { start: string; collected: Rappen }[];
}

/** The Overview all-time summary (step 1.9t); null when there are no orders at all. */
export function allTimeSummary(
  orders: readonly Order[],
  today: string,
): AllTime | null {
  if (!orders.length) return null;
  const { current, previous } = periodRanges("30d", today);
  const thisWeek = mondayOf(today);
  const weeks = Array.from({ length: ALL_TIME_WEEKS }, (_, i) => ({
    start: addDays(thisWeek, (i - ALL_TIME_WEEKS + 1) * 7),
    collected: 0,
  }));
  const summary: AllTime = {
    firstDay: today,
    collected: 0,
    last30: 0,
    previous30: 0,
    previousRange: previous,
    requested: 0,
    accepted: 0,
    commissionRecorded: 0,
    commissionEstimated: 0,
    orders: orders.length,
    completed: 0,
    weeks,
  };

  for (const o of orders) {
    const created = dayOf(o.createdAt);

    if (created < summary.firstDay) summary.firstDay = created;
    summary.requested += orderTotal(o);
    if (o.acceptedAt && o.status !== "cancelled")
      summary.accepted += orderTotal(o);
    if (o.status === "completed") summary.completed += 1;
    const fees = commission(o);

    if (fees.state === "recorded") summary.commissionRecorded += fees.total;
    if (fees.state === "estimated") summary.commissionEstimated += fees.total;
    for (const p of o.payments) {
      if (p.status !== "succeeded") continue;
      const day = dayOf(p.at);

      summary.collected += p.amount;
      if (within(day, current)) summary.last30 += p.amount;
      if (within(day, previous)) summary.previous30 += p.amount;
      const week = weeks.find((w) => w.start === mondayOf(day));

      if (week) week.collected += p.amount;
    }
  }

  return summary;
}
