import type { DateRange, ReportPeriod } from "../lib/report";
import type { ReportRowView } from "../components/partner-report";
import type { DeltaView } from "@/components/stat-card";
import type { CommissionState } from "@/features/orders/lib/selectors";

import { zurichHour } from "../lib/report";

import { usePartnerReport } from "./use-partner-report";

import { useLocale } from "@/contexts/locale-context";
import { zurichDate } from "@/features/catalog/lib/pickup";
import { deltaOf } from "@/features/merchant/today/lib/analytics";
import { formatMoney, formatShortDate } from "@/lib/format";

export interface DashKpi {
  id: "earned" | "paid" | "to-pay" | "orders";
  label: string;
  value: string;
  hint: string;
  /** Change against the previous period; null where a change says nothing (still to pay). */
  delta: DeltaView | null;
  /** A value per column of the period (commission, orders); null without a series. */
  spark: { id: string; value: number }[] | null;
  /** Share of the commission, 0–1, for "still to pay"; null elsewhere. */
  meter: number | null;
}

export interface BalancePart {
  id: "paid" | "to-pay" | "estimated";
  label: string;
  value: string;
  amount: number;
  colour: string;
  /** A line under the value: "CHF 11.10 still to offset". */
  caption: string | null;
}

export interface MonthBar {
  /** First day of the month, YYYY-MM-DD: the date a click opens. */
  id: string;
  tick: string;
  label: string;
  /** null before the first order: no bar and no click. */
  value: number | null;
  valueText: string;
  /** The month the period below shows. */
  isShown: boolean;
  isCurrent: boolean;
  ariaLabel: string;
}

export interface MixPart {
  id: "keepsakes" | "tours";
  label: string;
  value: string;
  amount: number;
  share: string;
  colour: string;
  track: string;
}

/** A transaction with what the dashboard filters it by. */
export interface DashRow extends ReportRowView {
  state: CommissionState;
  /** The chart column the order falls in. */
  bucketId: string;
}

/** Recorded, estimated, none: the red ramp the Overview and P02 use (analytics-chart-colours). */
export const BALANCE_COLOURS: Record<BalancePart["id"], string> = {
  paid: "var(--chart-1)",
  "to-pay": "var(--chart-1-mid)",
  estimated: "var(--chart-1-light)",
};

/** Keepsakes red, tours teal, as every gifts/tours split (owner 15.10.2026). */
const MIX = {
  keepsakes: { colour: "var(--chart-1)", track: "var(--chart-track)" },
  tours: { colour: "var(--chart-4)", track: "var(--chart-4-track)" },
};

/**
 * P02 as a dashboard: the period report of `usePartnerReport` plus what its widgets need on
 * top (comparison with the period before, the money split, months to jump to, the keepsakes
 * and tours split, and each transaction's chart column and commission state).
 */
export function usePartnerDashboard(
  partnerId: string,
  period: ReportPeriod,
  anchor?: string,
  /** Any range of days instead of the period around `anchor`. */
  range?: DateRange,
) {
  const { t, intlLocale } = useLocale();
  const base = usePartnerReport(partnerId, period, anchor, range);
  const { report, moneyIn, allTimeData, previousReport, previousMoney, today } =
    base.raw;
  const money = (rappen: number) => formatMoney(rappen / 100, intlLocale);
  const percent = (part: number, whole: number) =>
    new Intl.NumberFormat(intlLocale, { style: "percent" }).format(
      whole ? part / whole : 0,
    );

  const rangeText = ({ start, end }: DateRange) =>
    period === "day"
      ? formatShortDate(start, today, intlLocale)
      : period === "week"
        ? `${formatShortDate(start, today, intlLocale)} – ${formatShortDate(end, today, intlLocale)}`
        : new Intl.DateTimeFormat(intlLocale, {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          }).format(new Date(`${start}T12:00:00Z`));
  const previousRange = rangeText(previousReport.range);

  const delta = (value: number, previous: number): DeltaView => {
    const d = deltaOf(value, previous, "up", intlLocale);

    return {
      text: d.delta,
      tone: d.tone,
      direction: d.direction,
      label: d.delta
        ? t("partnerDash.kpi.vsPrevious", {
            delta: d.delta,
            range: previousRange,
          })
        : t("partnerDash.kpi.noPrevious", { range: previousRange }),
    };
  };

  // As the period's own figure: never below 0 after refund adjustments (D16).
  const earnedNow = Math.max(0, report.earned - moneyIn.adjusted);
  const earnedBefore = Math.max(
    0,
    previousReport.earned - previousMoney.adjusted,
  );
  const drawn = report.buckets.filter((b) => !b.isFuture);
  const columnId = (b: { start: string; hour?: number }) =>
    `${b.start}-${b.hour ?? ""}`;
  const kpis: DashKpi[] = base.kpis.map((k) => {
    switch (k.id) {
      case "earned":
        return {
          ...k,
          delta: delta(earnedNow, earnedBefore),
          spark: drawn.map((b) => ({
            id: columnId(b),
            value: (b.recorded + b.estimated) / 100,
          })),
          meter: null,
        };
      case "paid":
        return {
          ...k,
          delta: delta(moneyIn.paid, previousMoney.paid),
          spark: null,
          meter: null,
        };
      case "to-pay":
        return {
          ...k,
          hint: `${k.hint} · ${t("partnerDash.kpi.toPayShare", {
            share: percent(moneyIn.toPay, earnedNow),
          })}`,
          delta: null,
          spark: null,
          meter: earnedNow ? Math.min(1, moneyIn.toPay / earnedNow) : 0,
        };
      case "orders":
        return {
          ...k,
          delta: delta(report.rows.length, previousReport.rows.length),
          spark: drawn.map((b) => ({ id: columnId(b), value: b.orders })),
          meter: null,
        };
    }
  });

  // Previous period per column: hours and weekdays line up one to one; month weeks do not.
  const previousColumns =
    period === "month"
      ? null
      : previousReport.buckets.map((b) => {
          const amount = b.recorded + b.estimated;

          return {
            // Above 1 when the period before was higher than this scale: not drawn (the
            // readout still names the amount).
            share: amount / base.raw.chartTop,
            label: t("partnerDash.chart.previousValue", {
              amount: money(amount),
            }),
          };
        });

  const balance = allTimeData && {
    earned: money(allTimeData.earned),
    delta: base.allTime?.delta ?? null,
    sentence: base.allTime?.sentence ?? "",
    description: base.allTime?.description ?? "",
    parts: (
      [
        ["paid", moneyIn.allTime.paid],
        ["to-pay", moneyIn.allTime.toPay],
        ["estimated", allTimeData.estimated],
      ] as const
    ).map(([id, amount]): BalancePart => ({
      id,
      label: t(
        id === "paid"
          ? "partnerDash.balance.paid"
          : id === "to-pay"
            ? "partnerDash.balance.toPay"
            : "partnerDash.balance.estimated",
      ),
      value: money(amount),
      amount: Math.max(0, amount),
      colour: BALANCE_COLOURS[id],
      caption:
        id === "to-pay" && moneyIn.allTime.toOffset
          ? t("partnerReport.number.toPay.hintOffset", {
              amount: money(moneyIn.allTime.toOffset),
            })
          : null,
    })),
  };

  const monthName = (iso: string, opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(intlLocale, { ...opts, timeZone: "UTC" }).format(
      new Date(`${iso}T12:00:00Z`),
    );
  const months: MonthBar[] = (allTimeData?.months ?? []).map((m, i, all) => {
    const label = monthName(m.start, { month: "long", year: "numeric" });
    const valueText =
      m.earned === null ? t("partnerReport.allTime.noData") : money(m.earned);

    return {
      id: m.start,
      tick: monthName(m.start, { month: "short" }),
      label,
      value: m.earned === null ? null : m.earned / 100,
      valueText,
      isShown: period === "month" && report.range.start === m.start,
      isCurrent: i === all.length - 1,
      ariaLabel: t("partnerDash.months.open", {
        month: label,
        value: valueText,
      }),
    };
  });

  const tourGroup = report.groups.find((g) => g.subcategoryId === "tours");
  const tourAmount = tourGroup ? tourGroup.recorded + tourGroup.estimated : 0;
  const allAmount = report.groups.reduce(
    (sum, g) => sum + g.recorded + g.estimated,
    0,
  );
  const mix = {
    total: money(allAmount),
    isEmpty: allAmount === 0,
    parts: (
      [
        ["keepsakes", allAmount - tourAmount],
        ["tours", tourAmount],
      ] as const
    ).map(([id, amount]): MixPart => ({
      id,
      label: t(
        id === "tours" ? "partnerDash.mix.tours" : "partnerDash.mix.keepsakes",
      ),
      value: money(amount),
      amount,
      share: t("partnerDash.mix.share", {
        share: percent(amount, allAmount),
      }),
      ...MIX[id],
    })),
  };

  const rawRows = new Map(report.rows.map((r) => [r.id, r]));
  const rows: DashRow[] = base.rows.map((row) => {
    const raw = rawRows.get(row.id)!;
    const placed = new Date(raw.createdAt);
    const day = zurichDate(placed);
    const bucket = report.buckets.find((b) =>
      b.hour === undefined
        ? day >= b.start && day <= b.end
        : b.hour === zurichHour(placed),
    );

    return {
      ...row,
      state: raw.commission.state,
      bucketId: bucket ? columnId(bucket) : "",
    };
  });

  return {
    ...base,
    kpis,
    rows,
    balance,
    months,
    mix,
    previousColumns,
    comparison: t("partnerDash.compared", { range: previousRange }),
  };
}
