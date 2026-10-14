import type {
  CategoryId,
  LocalizedText,
  Rappen,
} from "@/features/catalog/types";
import type { DemoData } from "@/features/demo/types";
import type { CommissionState } from "@/features/orders/lib/selectors";
import type { OrderLabel } from "@/features/orders/lib/labels";

import { zurichDate } from "@/features/catalog/lib/pickup";
import { categories } from "@/features/catalog/seed";
import { zurichWeek } from "@/features/merchant/today/lib/today";
import { commissionLabel, progressLabel } from "@/features/orders/lib/labels";
import {
  commission,
  lineTotal,
  orderTotal,
} from "@/features/orders/lib/selectors";

export type ReportPeriod = "day" | "week" | "month";

export const REPORT_PERIODS: ReportPeriod[] = ["day", "week", "month"];

export const DEFAULT_REPORT_PERIOD: ReportPeriod = "month";

export const isReportPeriod = (value: unknown): value is ReportPeriod =>
  REPORT_PERIODS.includes(value as ReportPeriod);

/** Zurich calendar days, YYYY-MM-DD, both inclusive. */
export interface DateRange {
  start: string;
  end: string;
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);

  d.setUTCDate(d.getUTCDate() + days);

  return d.toISOString().slice(0, 10);
}

/** The day, Monday-to-Sunday week or calendar month that contains `anchor`. */
export function periodRange(period: ReportPeriod, anchor: string): DateRange {
  if (period === "day") return { start: anchor, end: anchor };
  if (period === "week") return zurichWeek(new Date(`${anchor}T12:00:00Z`));
  const start = `${anchor.slice(0, 7)}-01`;
  const nextMonth = new Date(`${start}T12:00:00Z`);

  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);

  return { start, end: addDays(nextMonth.toISOString().slice(0, 10), -1) };
}

/** First day of the period before (-1) or after (+1) the one containing `anchor`. */
export function shiftPeriod(
  period: ReportPeriod,
  anchor: string,
  step: -1 | 1,
): string {
  const { start, end } = periodRange(period, anchor);

  return step === 1
    ? addDays(end, 1)
    : periodRange(period, addDays(start, -1)).start;
}

/**
 * One transaction as the partner may see it (R15, AC12): reference, order date, guest
 * name, products, value, status and commission. No contact, engraving, pickup or payment.
 */
export interface ReportRow {
  id: string;
  ref: string;
  createdAt: string;
  guestName: string;
  lines: { productName: LocalizedText; quantity: number }[];
  value: Rappen;
  status: OrderLabel;
  commission: { state: CommissionState; amount: Rappen; label: OrderLabel };
}

export interface ReportGroup {
  categoryId: CategoryId;
  /** Orders with at least one line in this group. */
  orders: number;
  value: Rappen;
  recorded: Rappen;
  estimated: Rappen;
}

export interface PartnerReport {
  range: DateRange;
  /** Newest order first. */
  rows: ReportRow[];
  /** Recorded commission; no refunds before Phase 3, so no adjustments yet. */
  earned: Rappen;
  /** Payouts (M16) arrive in Phase 5; none are recorded in flow 1. */
  paid: Rappen;
  toPay: Rappen;
  /** Commission on open orders, not counted in `earned` until they complete. */
  estimated: Rappen;
  groups: ReportGroup[];
}

/**
 * P02 for one partner and period, filtered by the Zurich order date. Commission comes from
 * T0 `commission()`; cancelled and declined orders ("not-applicable") stay in the list but
 * add nothing to the numbers or the groups, so the groups sum to the headline numbers.
 */
export function partnerReport(
  data: Pick<DemoData, "orders" | "guests" | "products">,
  partnerId: string,
  period: ReportPeriod,
  anchor: string,
): PartnerReport {
  const range = periodRange(period, anchor);
  const orders = data.orders
    .filter((o) => o.partnerId === partnerId)
    .filter((o) => {
      const day = zurichDate(new Date(o.createdAt));

      return day >= range.start && day <= range.end;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const groups = new Map<CategoryId, ReportGroup>();
  let earned = 0;
  let estimated = 0;

  const rows = orders.map((order): ReportRow => {
    const fees = commission(order);
    const counts = fees.state === "recorded" || fees.state === "estimated";

    if (counts) {
      if (fees.state === "recorded") earned += fees.total;
      else estimated += fees.total;
      const seen = new Set<CategoryId>();

      order.lines.forEach((line, i) => {
        const categoryId = data.products.find(
          (p) => p.id === line.productId,
        )?.categoryId;

        if (!categoryId) return;
        const group = groups.get(categoryId) ?? {
          categoryId,
          orders: 0,
          value: 0,
          recorded: 0,
          estimated: 0,
        };
        const amount = fees.lines[i].amount;

        if (!seen.has(categoryId)) group.orders += 1;
        seen.add(categoryId);
        group.value += lineTotal(line);
        if (fees.state === "recorded") group.recorded += amount;
        else group.estimated += amount;
        groups.set(categoryId, group);
      });
    }

    return {
      id: order.id,
      ref: order.ref,
      createdAt: order.createdAt,
      guestName: data.guests.find((g) => g.id === order.guestId)?.name ?? "",
      lines: order.lines.map((l) => ({
        productName: l.productName,
        quantity: l.quantity,
      })),
      value: orderTotal(order),
      status: progressLabel(order, "staff"),
      commission: {
        state: fees.state,
        amount: counts ? fees.total : 0,
        label: commissionLabel(fees.state),
      },
    };
  });

  const paid = 0;

  return {
    range,
    rows,
    earned,
    paid,
    toPay: earned - paid,
    estimated,
    groups: categories.flatMap((c) => groups.get(c.id) ?? []),
  };
}
