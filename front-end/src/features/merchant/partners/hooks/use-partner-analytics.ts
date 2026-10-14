import type {
  DayRange,
  DeltaTone,
  PeriodId,
} from "@/features/merchant/today/lib/analytics";

import { useState } from "react";

import { useLocale } from "@/contexts/locale-context";
import { zurichDate, zurichDayOf } from "@/features/catalog/lib/pickup";
import { useDemo, useDemoNow } from "@/features/demo";
import {
  PERIODS,
  deltaOf,
  periodRanges,
} from "@/features/merchant/today/lib/analytics";
import { commissionItems } from "@/features/partners/lib/ledger";
import { linkOpens } from "@/features/partners/lib/link-opens";
import { formatMoney } from "@/lib/format";

/** Fixed per partner, in list order; partners beyond three share the muted colour. */
const PARTNER_COLOURS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"];

const periodLabel = {
  "7d": "overview.period.7d",
  "30d": "overview.period.30d",
  month: "overview.period.month",
} as const;

const dayOf = zurichDayOf;

function daysOf(range: DayRange): string[] {
  const days: string[] = [];
  const d = new Date(`${range.start}T12:00:00Z`);

  while (d.toISOString().slice(0, 10) <= range.end) {
    days.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }

  return days;
}

export interface PartnerKpiView {
  id: "opens" | "transactions" | "conversion" | "commission";
  label: string;
  value: string;
  delta: string;
  deltaTone: DeltaTone;
  direction: "up" | "down" | "flat" | "none";
  deltaLabel: string;
  trend: number[];
}

/**
 * M15 Analytics tab (D18): link opens, partner transactions, conversion and commission for
 * the Overview's periods, opens per day by partner, and a comparison of partners. Reads the
 * same transactions as M02 and P02 (D14); archived partners keep their history here.
 */
export function usePartnerAnalytics() {
  const { t, intlLocale } = useLocale();
  const { state } = useDemo();
  const now = useDemoNow();
  const [period, setPeriod] = useState<PeriodId>("30d");
  const today = zurichDate(now);
  const { current, previous } = periodRanges(period, today);
  const nowMs = now.getTime();

  const money = (rappen: number) => formatMoney(rappen / 100, intlLocale);
  const count = (n: number) => new Intl.NumberFormat(intlLocale).format(n);
  const percent = (part: number, whole: number) =>
    new Intl.NumberFormat(intlLocale, {
      style: "percent",
      maximumFractionDigits: 1,
    }).format(whole ? part / whole : 0);
  const range = (r: DayRange) =>
    (
      new Intl.DateTimeFormat(intlLocale, {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      }) as Intl.DateTimeFormat & { formatRange(a: Date, b: Date): string }
    ).formatRange(
      new Date(`${r.start}T12:00:00Z`),
      new Date(`${r.end}T12:00:00Z`),
    );

  const inRange = (at: string, r: DayRange) => {
    if (Date.parse(at) > nowMs) return false;
    const day = dayOf(at);

    return day >= r.start && day <= r.end;
  };

  const partners = state.data.partners;
  const opens = linkOpens(state.data);
  const items = partners.flatMap((p) => commissionItems(state.data, p.id));
  const adjustments = state.data.commissionAdjustments;

  const totals = (r: DayRange) => {
    const o = opens.filter((x) => inRange(x.at, r)).length;
    const tx = items.filter((i) => inRange(i.createdAt, r)).length;
    const commission =
      items
        .filter((i) => i.recordedAt && inRange(i.recordedAt, r))
        .reduce((sum, i) => sum + i.amount, 0) -
      adjustments
        .filter((a) => inRange(a.at, r))
        .reduce((sum, a) => sum + a.commission, 0);

    return { opens: o, transactions: tx, commission };
  };
  const cur = totals(current);
  const prev = totals(previous);
  const days = daysOf(current);

  const perDay = (pick: (day: string) => number) => days.map((d) => pick(d));
  const opensOn = (day: string, partnerId?: string) =>
    opens.filter(
      (o) =>
        (!partnerId || o.partnerId === partnerId) &&
        Date.parse(o.at) <= nowMs &&
        dayOf(o.at) === day,
    ).length;
  const transactionsOn = (day: string) =>
    items.filter(
      (i) => Date.parse(i.createdAt) <= nowMs && dayOf(i.createdAt) === day,
    ).length;
  const commissionOn = (day: string) =>
    items
      .filter((i) => i.recordedAt && dayOf(i.recordedAt) === day)
      .reduce((sum, i) => sum + i.amount, 0);

  const kpi = (
    id: PartnerKpiView["id"],
    value: number,
    before: number,
    text: string,
    trend: number[],
  ): PartnerKpiView => {
    const { delta, direction, tone } = deltaOf(value, before, "up", intlLocale);

    return {
      id,
      label: t(`partnerAnalytics.kpi.${id}`),
      value: text,
      delta,
      deltaTone: tone,
      direction,
      deltaLabel: delta
        ? t("overview.delta.label", { delta, range: range(previous) })
        : t("overview.delta.none", { range: range(previous) }),
      trend,
    };
  };

  const conversion = (o: number, tx: number) => (o ? tx / o : 0);
  const kpis = [
    kpi("opens", cur.opens, prev.opens, count(cur.opens), perDay(opensOn)),
    kpi(
      "transactions",
      cur.transactions,
      prev.transactions,
      count(cur.transactions),
      perDay(transactionsOn),
    ),
    kpi(
      "conversion",
      conversion(cur.opens, cur.transactions),
      conversion(prev.opens, prev.transactions),
      percent(cur.transactions, cur.opens),
      perDay((d) => conversion(opensOn(d), transactionsOn(d))),
    ),
    kpi(
      "commission",
      cur.commission,
      prev.commission,
      money(cur.commission),
      perDay(commissionOn),
    ),
  ];

  const series = partners
    .filter((p) =>
      opens.some((o) => o.partnerId === p.id && inRange(o.at, current)),
    )
    .map((p, index) => ({
      id: p.id,
      name: p.name,
      colour: PARTNER_COLOURS[index] ?? "var(--muted)",
    }));

  const compare = partners
    .map((p) => {
      const o = opens.filter(
        (x) => x.partnerId === p.id && inRange(x.at, current),
      ).length;
      const own = items.filter((i) => i.partnerId === p.id);
      const tx = own.filter((i) => inRange(i.createdAt, current)).length;
      const commission =
        own
          .filter((i) => i.recordedAt && inRange(i.recordedAt, current))
          .reduce((sum, i) => sum + i.amount, 0) -
        adjustments
          .filter((a) => a.partnerId === p.id && inRange(a.at, current))
          .reduce((sum, a) => sum + a.commission, 0);

      return {
        id: p.id,
        name: p.name,
        isArchived: !!p.archivedAt,
        opens: count(o),
        opensValue: o,
        transactionsValue: tx,
        transactions: count(tx),
        conversion: o ? percent(tx, o) : "–",
        commission: money(commission),
      };
    })
    .filter((row) => row.opensValue > 0 || row.transactionsValue > 0)
    .sort((a, b) => b.opensValue - a.opensValue);

  return {
    period,
    onPeriodChange: setPeriod,
    periods: PERIODS.map((id) => ({ id, label: t(periodLabel[id]) })),
    periodsLabel: t("overview.period.label"),
    comparison: t("overview.compare", {
      range: range(current),
      previous: range(previous),
    }),
    kpisLabel: t("partnerAnalytics.kpis"),
    kpis,
    daily: {
      title: t("partnerAnalytics.daily.title"),
      description: t("partnerAnalytics.daily.description"),
      series,
      days: days.map((day) => ({
        day,
        tick:
          day === today ? t("overview.today") : String(Number(day.slice(8))),
        ...Object.fromEntries(series.map((s) => [s.id, opensOn(day, s.id)])),
      })),
    },
    compare: {
      title: t("partnerAnalytics.compare.title"),
      description: t("partnerAnalytics.compare.description"),
      columns: {
        partner: t("merchantPartners.column.partner"),
        opens: t("partnerAnalytics.compare.opens"),
        transactions: t("merchantPartners.column.transactions"),
        conversion: t("partnerAnalytics.kpi.conversion"),
        commission: t("partnerAnalytics.compare.commission"),
      },
      archived: t("merchantPartners.archived"),
      rows: compare,
    },
    isEmpty: cur.opens === 0 && cur.transactions === 0,
    empty: t("partnerAnalytics.empty"),
    note: t("partnerAnalytics.note"),
  };
}

export type PartnerAnalyticsView = ReturnType<typeof usePartnerAnalytics>;
