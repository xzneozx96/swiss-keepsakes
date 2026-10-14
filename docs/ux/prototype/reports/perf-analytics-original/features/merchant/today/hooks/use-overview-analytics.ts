import type {
  DeltaTone,
  FunnelStep,
  KpiId,
  PeriodId,
  Polarity,
} from "../lib/analytics";
import type { AllTimeCardProps } from "@/components/stat-card";
import type { MessageKey } from "@/i18n/en";
import type { PaymentMethod } from "@/features/orders/types";

import { useMemo, useState } from "react";

import {
  allTimeSummary,
  deltaOf,
  overviewAnalytics,
  PERIODS,
} from "../lib/analytics";
import { DEMO_HISTORY } from "../lib/demo-history";

import {
  OrdersIcon,
  PartnersIcon,
  StatusSuccessIcon,
} from "@/components/icons";
import { useLocale } from "@/contexts/locale-context";
import { categories } from "@/features/catalog/seed";
import { zurichDate } from "@/features/catalog/lib/pickup";
import { useDemo, useDemoNow } from "@/features/demo";
import { formatMoney, formatShortDate } from "@/lib/format";
import { pickText } from "@/lib/localized";

const periodLabel: Record<PeriodId, MessageKey> = {
  "7d": "overview.period.7d",
  "30d": "overview.period.30d",
  month: "overview.period.month",
};

const kpiLabel: Record<KpiId, MessageKey> = {
  accepted: "overview.kpi.accepted",
  requested: "overview.kpi.requested",
  collected: "overview.kpi.collected",
  toCollect: "overview.kpi.toCollect",
  commission: "overview.kpi.commission",
  orders: "overview.kpi.orders",
  average: "overview.kpi.average",
};

/**
 * Which way is good. Revenue and orders up is good; still to collect up is not; commission
 * follows revenue, so it is shown without a verdict.
 */
const kpiPolarity: Record<KpiId, Polarity> = {
  accepted: "up",
  requested: "up",
  collected: "up",
  toCollect: "down",
  commission: "neutral",
  orders: "up",
  average: "up",
};

const stepLabel: Record<FunnelStep, MessageKey> = {
  requested: "overview.funnel.requested",
  accepted: "overview.funnel.accepted",
  paid: "overview.funnel.paid",
  completed: "overview.funnel.completed",
  declined: "overview.funnel.declined",
  cancelled: "overview.funnel.cancelled",
};

const methodLabel: Record<PaymentMethod, MessageKey> = {
  online: "merchantOrder.method.online",
  cash: "merchantOrder.method.cash",
  "bank-transfer": "merchantOrder.method.bankTransfer",
  other: "merchantOrder.method.other",
};

export interface KpiView {
  id: KpiId;
  label: string;
  value: string;
  /** "+12%", "−4%", "±0%", or "" when there is nothing to compare with. */
  delta: string;
  deltaTone: DeltaTone;
  direction: "up" | "down" | "flat" | "none";
  /** Screen-reader sentence for the delta: "+12% compared with 6–12 Oct". */
  deltaLabel: string;
  trend: (number | null)[];
}

export interface DayView {
  day: string;
  /** Axis label: "13" (day of month) or "Today". */
  tick: string;
  /** Tooltip heading: "Tue 13 Oct" or "Today, Tue 13 Oct". */
  label: string;
  orders: number;
  /** Collected CHF (not Rappen), for the chart scale. */
  collected: number;
  collectedText: string;
  isToday: boolean;
}

export interface ShareRow {
  id: string;
  label: string;
  value: number;
  valueText: string;
  /** "42%" of the widget total. */
  share: string;
  detail: string;
}

/** The Overview analytics section: KPIs, the daily chart and four breakdowns for one period. */
export function useOverviewAnalytics() {
  const { t, language, intlLocale } = useLocale();
  const { state } = useDemo();
  const now = useDemoNow();
  const [period, setPeriod] = useState<PeriodId>("7d");
  const today = zurichDate(now);
  const { orders, products, pickupPlaces } = state.data;
  // The demo history fills the charts only while the demo has orders; a cleared demo shows
  // the analytics empty state (step 1.9s).
  const withHistory = useMemo(
    () => (orders.length ? [...DEMO_HISTORY, ...orders] : []),
    [orders],
  );
  const data = useMemo(
    () => overviewAnalytics(withHistory, products, period, today),
    [withHistory, products, period, today],
  );

  const money = (rappen: number) => formatMoney(rappen / 100, intlLocale);
  const count = (n: number) => new Intl.NumberFormat(intlLocale).format(n);
  const percent = (part: number, whole: number) =>
    new Intl.NumberFormat(intlLocale, { style: "percent" }).format(
      whole ? part / whole : 0,
    );
  const plural = new Intl.PluralRules(intlLocale);
  const orderCount = (n: number) =>
    t(
      plural.select(n) === "one"
        ? "merchantToday.orders.one"
        : "merchantToday.orders.other",
      { count: n },
    );
  const short = (iso: string) => formatShortDate(iso, today, intlLocale);
  // "7–13 Oct", "14 Sept – 13 Oct"; DE "7.–13. Okt." (formatRange is ES2021; the tsconfig
  // lib is ES2020, every supported browser has it).
  const range = (r: { start: string; end: string }) =>
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
  const previousRange = range(data.previous);

  const kpis: KpiView[] = data.kpis.map((k) => {
    const isMoney = k.id !== "orders";
    const {
      delta,
      direction,
      tone: deltaTone,
    } = deltaOf(k.value, k.previous, kpiPolarity[k.id], intlLocale);

    return {
      id: k.id,
      label: t(kpiLabel[k.id]),
      value: isMoney ? money(k.value) : count(k.value),
      delta,
      deltaTone,
      direction,
      deltaLabel: delta
        ? t("overview.delta.label", { delta, range: previousRange })
        : t("overview.delta.none", { range: previousRange }),
      trend: k.trend,
    };
  });

  const days: DayView[] = data.days.map((d) => {
    const isToday = d.day === today;

    return {
      day: d.day,
      tick: isToday
        ? t("overview.trend.todayTick")
        : String(Number(d.day.slice(8))),
      label: isToday
        ? t("overview.trend.todayLabel", { date: short(d.day) })
        : short(d.day),
      orders: d.orders,
      collected: d.collected / 100,
      collectedText: money(d.collected),
      isToday,
    };
  });
  const totals = {
    orders: days.reduce((sum, d) => sum + d.orders, 0),
    collected: data.days.reduce((sum, d) => sum + d.collected, 0),
  };

  const requested = data.funnel[0].count;
  const funnel = data.funnel.map((f) => ({
    id: f.step,
    label: t(stepLabel[f.step]),
    value: f.count,
    valueText: count(f.count),
    share: percent(f.count, requested),
    isLost: f.step === "declined" || f.step === "cancelled",
  }));

  const groupTotal = data.groups.reduce((sum, g) => sum + g.value, 0);
  const groups: ShareRow[] = data.groups.map((g) => {
    const category = categories.find((c) => c.id === g.id);

    return {
      id: g.id,
      label: category ? pickText(category.name, language).text : g.id,
      value: g.value / 100,
      valueText: money(g.value),
      share: percent(g.value, groupTotal),
      detail: "",
    };
  });

  const methodTotal = data.methods.reduce((sum, m) => sum + m.amount, 0);
  const methods: ShareRow[] = data.methods.map((m) => ({
    id: m.method,
    label: t(methodLabel[m.method]),
    value: m.amount / 100,
    valueText: money(m.amount),
    share: percent(m.amount, methodTotal),
    detail: t(
      plural.select(m.count) === "one"
        ? "overview.methods.payments.one"
        : "overview.methods.payments.other",
      { count: m.count },
    ),
  }));

  const placeTotal = data.places.reduce((sum, p) => sum + p.value, 0);
  const places: ShareRow[] = data.places.map((p) => {
    const place = pickupPlaces.find((x) => x.id === p.id);

    return {
      id: p.id,
      label: place ? pickText(place.name, language).text : p.id,
      value: p.value / 100,
      valueText: money(p.value),
      share: percent(p.value, placeTotal),
      detail: orderCount(p.orders),
    };
  });

  const allTime = useMemo(
    () => allTimeSummary(withHistory, today),
    [withHistory, today],
  );
  const dayMonth = (iso: string, opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(intlLocale, { ...opts, timeZone: "UTC" }).format(
      new Date(`${iso}T12:00:00Z`),
    );
  const allTimeView: AllTimeCardProps | null = allTime && {
    id: "overview-alltime",
    title: t("overview.allTime.title"),
    description: t("overview.allTime.description", {
      date: dayMonth(allTime.firstDay, {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    }),
    value: money(allTime.collected),
    delta: (() => {
      const d = deltaOf(allTime.last30, allTime.previous30, "up", intlLocale);
      const span = range(allTime.previousRange);

      return {
        text: d.delta,
        tone: d.tone,
        direction: d.direction,
        label: d.delta
          ? t("overview.delta.label", { delta: d.delta, range: span })
          : t("overview.delta.none", { range: span }),
      };
    })(),
    sentence: t("overview.allTime.sentence", {
      last: money(allTime.last30),
      previous: money(allTime.previous30),
    }),
    chart: {
      title: t("overview.allTime.chart"),
      bars: allTime.weeks.map((w, i) => {
        const isCurrent = i === allTime.weeks.length - 1;
        const date = dayMonth(w.start, { day: "numeric", month: "short" });

        return {
          id: w.start,
          // Numeric on the axis ("31/8", "31.8."): seven short-month labels collide at 375px.
          tick: dayMonth(w.start, { day: "numeric", month: "numeric" }),
          label: isCurrent
            ? t("overview.allTime.thisWeek")
            : t("overview.allTime.week", { date }),
          value: w.collected / 100,
          valueText: money(w.collected),
          isCurrent,
        };
      }),
      tableLabels: {
        item: t("overview.allTime.weekColumn"),
        value: t("overview.kpi.collected"),
      },
    },
    metricsLabel: t("overview.allTime.metrics"),
    metrics: [
      {
        id: "accepted",
        icon: StatusSuccessIcon,
        label: t("overview.kpi.accepted"),
        value: money(allTime.accepted),
        caption: t("overview.allTime.accepted.caption", {
          share: percent(allTime.accepted, allTime.requested),
          total: money(allTime.requested),
        }),
        share: allTime.requested ? allTime.accepted / allTime.requested : 0,
      },
      {
        id: "commission",
        icon: PartnersIcon,
        label: t("overview.kpi.commission"),
        value: money(allTime.commissionRecorded),
        caption: t("overview.allTime.commission.caption", {
          share: percent(
            allTime.commissionRecorded,
            allTime.commissionRecorded + allTime.commissionEstimated,
          ),
          total: money(
            allTime.commissionRecorded + allTime.commissionEstimated,
          ),
        }),
        share:
          allTime.commissionRecorded /
          Math.max(1, allTime.commissionRecorded + allTime.commissionEstimated),
      },
      {
        id: "completed",
        icon: OrdersIcon,
        label: t("overview.allTime.completed"),
        value: count(allTime.completed),
        caption: t("overview.allTime.completed.caption", {
          share: percent(allTime.completed, allTime.orders),
          total: count(allTime.orders),
        }),
        share: allTime.completed / allTime.orders,
      },
    ],
  };

  return {
    heading: t("overview.analytics"),
    allTime: allTimeView,
    period,
    onPeriodChange: setPeriod,
    periods: PERIODS.map((id) => ({ id, label: t(periodLabel[id]) })),
    periodsLabel: t("overview.period.label"),
    comparison: t("overview.compare", {
      range: range(data.current),
      previous: previousRange,
    }),
    demoNote: t("overview.demoNote"),
    isEmpty: data.isEmpty,
    empty: t("overview.empty"),
    kpisLabel: t("overview.kpis"),
    kpis,
    trend: {
      title: t("overview.trend.title"),
      description: t("overview.trend.description"),
      collectedLabel: t("overview.trend.collected"),
      ordersLabel: t("overview.trend.orders"),
      dayLabel: t("overview.table.day"),
      showTable: t("overview.table.show"),
      showChart: t("overview.table.hide"),
      summary: t("overview.trend.summary", {
        orders: orderCount(totals.orders),
        collected: money(totals.collected),
        range: range(data.current),
      }),
      days,
    },
    funnel: {
      title: t("overview.funnel.title"),
      description: t("overview.funnel.description"),
      lostLabel: t("overview.funnel.lost"),
      steps: funnel,
    },
    groups: {
      title: t("overview.groups.title"),
      description: t("overview.groups.description"),
      total: money(groupTotal),
      rows: groups,
    },
    methods: {
      title: t("overview.methods.title"),
      description: t("overview.methods.description"),
      total: money(methodTotal),
      rows: methods,
    },
    places: {
      title: t("overview.places.title"),
      description: t("overview.places.description"),
      total: money(placeTotal),
      rows: places,
    },
    tableLabels: {
      item: t("overview.table.item"),
      value: t("overview.table.value"),
      share: t("overview.table.share"),
    },
    none: t("overview.none"),
  };
}

export type OverviewAnalyticsView = ReturnType<typeof useOverviewAnalytics>;
