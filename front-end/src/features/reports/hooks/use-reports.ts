import type { MoneyMetric, ReportFilters } from "../lib/money";
import type { DeltaView } from "@/components/stat-card";
import type {
  DayRange,
  PeriodId,
  Polarity,
} from "@/features/merchant/today/lib/analytics";

import { useMemo } from "react";

import {
  FUNNEL_STEPS,
  articleStats,
  funnel,
  widgetStats,
} from "../lib/behaviour";
import { margin } from "../lib/margin";
import {
  MONEY_METRICS,
  matchesFilters,
  moneySummary,
  total,
} from "../lib/money";
import { GUEST_GROUPS, reportTransactions } from "../lib/transactions";

import { useLocale } from "@/contexts/locale-context";
import { zurichDate } from "@/features/catalog/lib/pickup";
import { useDemo, useDemoNow } from "@/features/demo";
import {
  PERIODS,
  deltaOf,
  periodRanges,
} from "@/features/merchant/today/lib/analytics";
import { variantAvailable } from "@/features/orders/lib/selectors";
import { departureSeats } from "@/features/tours/lib/selectors";
import { formatMoney, formatShortDate } from "@/lib/format";
import { pickText } from "@/lib/localized";

const periodLabel = {
  "7d": "overview.period.7d",
  "30d": "overview.period.30d",
  month: "overview.period.month",
} as const;

/** The Overview funnel's ordinal red ramp (1.9t), extended to six steps. */
const FUNNEL_SHADES = [
  "var(--chart-1-dark)",
  "var(--chart-1-dark)",
  "var(--chart-1)",
  "var(--chart-1)",
  "var(--chart-1-mid)",
  "var(--chart-1-light)",
];

/** More collected or earned is good; more still owed or refunded is not. */
const polarity: Record<MoneyMetric, Polarity> = {
  value: "up",
  collected: "up",
  outstanding: "down",
  refunds: "down",
  commission: "neutral",
};

function daysOf(r: DayRange): string[] {
  const days: string[] = [];
  const d = new Date(`${r.start}T12:00:00Z`);

  while (d.toISOString().slice(0, 10) <= r.end) {
    days.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }

  return days;
}

export interface MoneyCardView {
  id: MoneyMetric;
  label: string;
  value: string;
  goods: string;
  tours: string;
  hint: string;
  delta: DeltaView;
  trend: number[];
}

/**
 * M21 Reports (spec §4.13, steps 5.9–5.12): the Overview's periods and the report filters
 * over one shared set of transactions (D14). Step 5.9: the money summary.
 */
export function useReports(period: PeriodId, filters: ReportFilters) {
  const { t, language, intlLocale } = useLocale();
  const { state } = useDemo();
  const now = useDemoNow();
  const today = zurichDate(now);
  const { orders, tours, commissionAdjustments, partners, products } =
    state.data;
  const all = useMemo(
    () => reportTransactions({ orders, tours }),
    [orders, tours],
  );
  const txs = useMemo(
    () => all.filter((tx) => matchesFilters(tx, filters)),
    [all, filters],
  );
  const ranges = useMemo(() => periodRanges(period, today), [period, today]);
  const { current, previous } = ranges;
  const money = (rappen: number) => formatMoney(rappen / 100, intlLocale);
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

  const summary = useMemo(() => {
    const cur = moneySummary(txs, commissionAdjustments, ranges.current);
    const prev = moneySummary(txs, commissionAdjustments, ranges.previous);
    const daily = daysOf(ranges.current).map((day) =>
      moneySummary(txs, commissionAdjustments, { start: day, end: day }),
    );

    return { cur, prev, daily };
  }, [txs, commissionAdjustments, ranges]);

  const cards: MoneyCardView[] = MONEY_METRICS.map((id) => {
    const value = total(summary.cur[id]);
    const before = total(summary.prev[id]);
    const d = deltaOf(value, before, polarity[id], intlLocale);

    return {
      id,
      label: t(`reports.money.${id}`),
      value: money(value),
      goods: t("reports.money.goods", { amount: money(summary.cur[id].goods) }),
      tours: t("reports.money.tours", { amount: money(summary.cur[id].tours) }),
      hint: t(`reports.money.${id}.hint`),
      delta: {
        text: d.delta,
        tone: d.tone,
        direction: d.direction,
        label: d.delta
          ? t("overview.delta.label", {
              delta: d.delta,
              range: range(previous),
            })
          : t("overview.delta.none", { range: range(previous) }),
      },
      trend: summary.daily.map((s) => total(s[id])),
    };
  });

  // Step 5.10: funnel, sources and guest groups.
  const count = (n: number) => new Intl.NumberFormat(intlLocale).format(n);
  const pct = (part: number, whole: number) =>
    new Intl.NumberFormat(intlLocale, {
      style: "percent",
      maximumFractionDigits: 1,
    }).format(whole ? part / whole : 0);
  const { referralVisits } = state.data;
  /** Visits, views and starts happen before a guest has a group or a basket. */
  const businessOnly =
    filters.type !== "all" || filters.group !== "all" || filters.item !== "all";
  const funnelData = useMemo(() => {
    const main = funnel(
      { referralVisits },
      txs,
      ranges.current,
      filters.source,
    );
    const sources = ["direct", ...partners.map((p) => p.id)]
      .filter((id) => filters.source === "all" || filters.source === id)
      .map((id) => {
        const sourceTxs = txs.filter((tx) =>
          id === "direct" ? !tx.partnerId : tx.partnerId === id,
        );
        const f = funnel({ referralVisits }, sourceTxs, ranges.current, id);
        const value = sourceTxs
          .filter(
            (tx) =>
              tx.day >= ranges.current.start && tx.day <= ranges.current.end,
          )
          .reduce((sum, tx) => sum + tx.value, 0);

        return { id, steps: f.steps, value };
      });

    return { main, sources };
  }, [referralVisits, txs, ranges, filters.source, partners]);

  const shownSteps = FUNNEL_STEPS.filter(
    (step) => !businessOnly || ["sent", "paid", "completed"].includes(step),
  );
  const top = funnelData.main.steps[shownSteps[0]];
  const funnelRows = shownSteps.map((step, i) => {
    const value = funnelData.main.steps[step];
    const before = i > 0 ? funnelData.main.steps[shownSteps[i - 1]] : value;

    return {
      id: step,
      label: t(`reports.funnel.${step}`),
      value,
      valueText: count(value),
      share: pct(value, top),
      colour: FUNNEL_SHADES[i] ?? "var(--chart-1-light)",
      drop:
        i > 0 && before > 0
          ? t("reports.funnel.drop", { share: pct(before - value, before) })
          : null,
    };
  });
  const inPeriod = txs.filter(
    (tx) => tx.day >= ranges.current.start && tx.day <= ranges.current.end,
  );
  const periodValue = inPeriod.reduce((sum, tx) => sum + tx.value, 0);
  const groups = GUEST_GROUPS.map((g) => {
    const list = inPeriod.filter((tx) => tx.group === g);
    const value = list.reduce((sum, tx) => sum + tx.value, 0);

    return {
      id: g,
      label: t(`reports.group.${g}`),
      value,
      valueText: money(value),
      share: pct(value, periodValue),
      colour: g === "unknown" ? "var(--chart-3)" : "var(--chart-1)",
      detail: t("reports.groups.count", { count: list.length }),
    };
  });
  const sourceName = (id: string) =>
    id === "direct"
      ? t("reports.filter.source.direct")
      : (partners.find((p) => p.id === id)?.name ?? id);

  // Step 5.11: products, operations, content.
  const productName = (id: string) => {
    const p = products.find((x) => x.id === id);

    if (p) return pickText(p.name, language).text;
    const tour = tours?.tours.find((x) => x.id === id);

    return tour ? pickText(tour.name, language).text : id;
  };
  const sold = (kind: "goods" | "tours") => {
    const byItem = new Map<string, { quantity: number; value: number }>();

    for (const tx of inPeriod) {
      if (tx.status === "lost") continue;
      for (const l of tx.lines) {
        if (l.kind !== kind) continue;
        const row = byItem.get(l.itemId) ?? { quantity: 0, value: 0 };

        row.quantity += l.quantity;
        row.value += l.value;
        byItem.set(l.itemId, row);
      }
    }
    const sum = [...byItem.values()].reduce((a, r) => a + r.value, 0);

    return [...byItem.entries()]
      .sort((a, b) => b[1].value - a[1].value)
      .slice(0, 6)
      .map(([id, r]) => ({
        id,
        label: productName(id),
        value: r.value,
        valueText: money(r.value),
        share: pct(r.value, sum),
        colour: "var(--chart-1)",
        detail: t(
          kind === "goods"
            ? "reports.products.units"
            : "reports.products.guests",
          { count: r.quantity },
        ),
      }));
  };
  const lowStock = products.flatMap((p) =>
    p.variants
      .map((v) => ({
        id: `${p.id}-${v.id}`,
        name:
          p.variants.length > 1
            ? `${pickText(p.name, language).text} · ${pickText(v.label, language).text}`
            : pickText(p.name, language).text,
        left: variantAvailable(state.data, p.id, v.id),
      }))
      .filter((v) => v.left <= 2),
  );
  const soon = now.getTime() + 14 * 24 * 60 * 60 * 1000;
  const seats = (tours?.departures ?? [])
    .filter(
      (d) =>
        !d.cancelledAt &&
        Date.parse(d.startsAt) > now.getTime() &&
        Date.parse(d.startsAt) < soon,
    )
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
    .slice(0, 6)
    .map((d) => {
      const s = tours ? departureSeats(tours, d.id, now) : null;

      return {
        id: d.id,
        name: productName(d.tourId),
        when: formatShortDate(
          zurichDate(new Date(d.startsAt)),
          today,
          intlLocale,
        ),
        taken: s ? s.confirmed + s.held : 0,
        capacity: s?.capacity ?? d.capacity,
      };
    });
  const outcome = (kind: "goods" | "tours", status: string) =>
    inPeriod.filter((tx) => tx.kind === kind && tx.status === status).length;
  const articles = state.data.articles
    .filter((a) => a.publication.status === "published")
    .map((a) => {
      const stats = articleStats(a.id, ranges.current);

      return {
        id: a.id,
        title: a.title,
        language: a.language.toUpperCase(),
        views: count(stats.views),
        clicks: count(stats.clicks),
        rate: pct(stats.clicks, stats.views),
        viewsValue: stats.views,
      };
    })
    .sort((a, b) => b.viewsValue - a.viewsValue)
    .slice(0, 5);
  const adviceSent = state.data.adviceRequests.filter((r) => {
    const day = zurichDate(new Date(r.sentAt));

    return day >= ranges.current.start && day <= ranges.current.end;
  }).length;
  const widget = widgetStats(ranges.current, adviceSent);

  // Step 5.12: contribution margin, only from complete actual costs (R14).
  const { costs } = state.data;
  const marginData = useMemo(
    () => margin(txs, costs, commissionAdjustments, ranges.current),
    [txs, costs, commissionAdjustments, ranges],
  );
  const marginPart = (kind: "goods" | "tours") => {
    const m = marginData[kind];

    return {
      id: kind,
      label: t(`reports.margin.${kind}`),
      hasData: m.complete > 0,
      value: money(m.margin),
      rate: pct(m.margin, m.revenue),
      revenue: money(m.revenue),
      costs: money(m.costs),
      coverage: t("reports.margin.coverage", {
        complete: m.complete,
        sales: m.sales,
      }),
      share: m.sales ? m.complete / m.sales : 0,
      sales: m.sales,
    };
  };
  const allSales = marginData.goods.sales + marginData.tours.sales;
  const allComplete = marginData.goods.complete + marginData.tours.complete;

  const sourceOptions = [
    { id: "all", label: t("reports.filter.source.all") },
    { id: "direct", label: t("reports.filter.source.direct") },
    ...partners.map((p) => ({ id: p.id, label: p.name })),
  ];
  const itemOptions = [
    { id: "all", label: t("reports.filter.item.all") },
    ...products.map((p) => ({
      id: p.id,
      label: pickText(p.name, language).text,
    })),
    ...(tours?.tours ?? []).map((x) => ({
      id: x.id,
      label: pickText(x.name, language).text,
    })),
  ];

  return {
    periods: PERIODS.map((id) => ({ id, label: t(periodLabel[id]) })),
    periodsLabel: t("overview.period.label"),
    comparison: t("overview.compare", {
      range: range(current),
      previous: range(previous),
    }),
    filterOptions: {
      source: sourceOptions,
      type: (["all", "goods", "tours"] as const).map((id) => ({
        id,
        label: t(`reports.filter.type.${id}`),
      })),
      group: (["all", ...GUEST_GROUPS] as const).map((id) => ({
        id,
        label: t(`reports.group.${id}`),
      })),
      item: itemOptions,
    },
    money: {
      cards,
      isEmpty: MONEY_METRICS.every((id) => total(summary.cur[id]) === 0),
    },
    funnel: {
      rows: funnelRows,
      businessOnly,
      coverage:
        funnelData.main.coverage < 0.995
          ? t("reports.funnel.coverage", {
              share: pct(funnelData.main.coverage, 1),
            })
          : null,
      sources: funnelData.sources.map((x) => ({
        id: x.id,
        name: sourceName(x.id),
        visits: count(x.steps.visits),
        sent: count(x.steps.sent),
        completed: count(x.steps.completed),
        conversion: x.steps.visits ? pct(x.steps.sent, x.steps.visits) : "–",
        value: money(x.value),
      })),
      groups,
      groupsTotal: money(periodValue),
    },
    products: {
      goods: sold("goods"),
      tours: sold("tours"),
      lowStock,
      seats,
      outcomes: [
        {
          id: "goods-completed",
          label: t("reports.outcome.goodsCompleted"),
          value: outcome("goods", "completed"),
        },
        {
          id: "goods-lost",
          label: t("reports.outcome.goodsLost"),
          value: outcome("goods", "lost"),
        },
        {
          id: "tours-completed",
          label: t("reports.outcome.toursCompleted"),
          value: outcome("tours", "completed"),
        },
        {
          id: "tours-noshow",
          label: t("reports.outcome.toursNoShow"),
          value: outcome("tours", "no-show"),
        },
        {
          id: "tours-lost",
          label: t("reports.outcome.toursLost"),
          value: outcome("tours", "lost"),
        },
      ],
      articles,
      widget: [
        {
          id: "opened",
          label: t("reports.widget.opened"),
          value: count(widget.opened),
        },
        {
          id: "started",
          label: t("reports.widget.started"),
          value: count(widget.started),
        },
        {
          id: "sent",
          label: t("reports.widget.sent"),
          value: count(widget.sent),
        },
      ],
    },
    margin: {
      parts: [marginPart("goods"), marginPart("tours")],
      summary:
        allSales === 0
          ? null
          : allComplete === allSales
            ? t("reports.margin.allComplete", { sales: allSales })
            : t("reports.margin.partial", {
                complete: allComplete,
                sales: allSales,
                missing: allSales - allComplete,
              }),
      share: allSales ? allComplete / allSales : 0,
      missing: marginData.missing.slice(0, 5).map(({ tx, types }) => ({
        id: tx.key,
        ref: tx.ref,
        name: productName(tx.lines[0]?.itemId ?? ""),
        items: types.map((type) => t(`costData.type.${type}`)).join(", "),
      })),
      missingCount: marginData.missing.length,
    },
    txs,
    current,
    previous,
  };
}

export type ReportsView = ReturnType<typeof useReports>;
