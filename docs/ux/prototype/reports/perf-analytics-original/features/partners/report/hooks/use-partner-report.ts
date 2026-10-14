import type { ReportBucket, ReportPeriod, ReportRow } from "../lib/report";
import type {
  ReportChartView,
  ReportGroupView,
  ReportKpi,
  ReportRowView,
} from "../components/partner-report";
import type { AllTimeCardProps } from "@/components/stat-card";
import type { MessageKey } from "@/i18n/en";
import type { IntlLocale } from "@/lib/format";

import { useMemo } from "react";

import {
  partnerAllTime,
  partnerReport,
  periodRange,
  REPORT_PERIODS,
  shiftPeriod,
} from "../lib/report";

import { ClockIcon, PartnersIcon, PayLaterIcon } from "@/components/icons";
import { useLocale } from "@/contexts/locale-context";
import { zurichDate } from "@/features/catalog/lib/pickup";
import { categories } from "@/features/catalog/seed";
import { useDemo, useDemoNow } from "@/features/demo";
import { deltaOf } from "@/features/merchant/today/lib/analytics";
import { DEMO_HISTORY } from "@/features/merchant/today/lib/demo-history";
import { formatLabel } from "@/features/orders/lib/labels";
import { formatOrderDate } from "@/features/orders/lib/format";
import { formatMoney, formatShortDate } from "@/lib/format";
import { pickText } from "@/lib/localized";

const periodLabels: Record<ReportPeriod, MessageKey> = {
  day: "partnerReport.period.day",
  week: "partnerReport.period.week",
  month: "partnerReport.period.month",
};

const chartTitles: Record<ReportPeriod, MessageKey> = {
  day: "partnerReport.chart.title.day",
  week: "partnerReport.chart.title.week",
  month: "partnerReport.chart.title.month",
};

/** Smallest round step (in Rappen) that covers `max` in at most four gridlines. */
function chartScale(max: number): { top: number; step: number } {
  for (const francs of [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000]) {
    const step = francs * 100;

    if (max <= step * 4)
      return { top: Math.max(1, Math.ceil(max / step)) * step, step };
  }
  const step = Math.ceil(max / 400) * 100;

  return { top: step * 4, step };
}

const hourLabel = (hour: number) => `${String(hour).padStart(2, "0")}:00`;

/** "12–18 Oct" for a week inside one month. */
function dayRange(b: ReportBucket, locale: IntlLocale): string {
  const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, { ...opts, timeZone: "UTC" }).format(
      new Date(`${iso}T12:00:00Z`),
    );
  const month = fmt(b.end, { day: "numeric", month: "short" });

  return b.start === b.end
    ? month
    : `${fmt(b.start, { day: "numeric" }).replace(/\.$/, "")}–${month}`;
}

/**
 * P02 Partner report for the partner who opened their report link (P01, step 5.6).
 * `anchor` is any Zurich day inside the period; absent = today.
 */
export function usePartnerReport(
  partnerId: string,
  period: ReportPeriod,
  anchor?: string,
) {
  const { t, language, intlLocale } = useLocale();
  const { state } = useDemo();
  const now = useDemoNow();
  const today = zurichDate(now);
  const day = anchor ?? today;
  const partner =
    state.data.partners.find((p) => p.id === partnerId) ??
    state.data.partners[0];
  const { orders } = state.data;
  const tourBookings = state.data.tours?.bookings;
  // The 1.9s demo history counts here too (owner review 1.9t), so the all-time card and the
  // period report agree; only while the demo has orders, as on M02.
  const withHistory = useMemo(
    () => (orders.length ? [...DEMO_HISTORY, ...orders] : []),
    [orders],
  );
  const report = partnerReport(
    { ...state.data, orders: withHistory },
    partner.id,
    period,
    day,
    now,
  );
  const allTimeData = useMemo(
    () => partnerAllTime(withHistory, partner.id, today, tourBookings),
    [withHistory, partner.id, today, tourBookings],
  );
  const money = (rappen: number) => formatMoney(rappen / 100, intlLocale);
  const plural = new Intl.PluralRules(intlLocale);
  const share = (part: number, whole: number) =>
    new Intl.NumberFormat(intlLocale, { style: "percent" }).format(
      whole ? part / whole : 0,
    );
  const { start, end } = report.range;

  const rangeLabel =
    period === "day"
      ? formatShortDate(start, today, intlLocale)
      : period === "week"
        ? `${formatShortDate(start, today, intlLocale)} – ${formatShortDate(end, today, intlLocale)}`
        : new Intl.DateTimeFormat(intlLocale, {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          }).format(new Date(`${start}T12:00:00Z`));

  const ordersText = (count: number) =>
    t(
      plural.select(count) === "one"
        ? "partnerReport.chart.orders.one"
        : "partnerReport.chart.orders.other",
      { count },
    );

  const gifts = ({ lines }: ReportRow) => {
    const [first, ...rest] = lines;
    const product = first ? pickText(first.productName, language).text : "";
    const vars = {
      product,
      quantity: first?.quantity ?? 0,
      count: rest.length,
    };

    return t(
      rest.length ? "partnerReport.giftsMore" : "partnerReport.gifts",
      vars,
    );
  };

  const rows: ReportRowView[] = report.rows.map((row) => ({
    id: row.id,
    reference: row.ref,
    date: formatOrderDate(zurichDate(new Date(row.createdAt)), intlLocale),
    guestName: row.guestName,
    gifts: gifts(row),
    value: money(row.value),
    status: {
      text: formatLabel(row.status, t, intlLocale),
      tone: row.status.tone,
    },
    commission: {
      amount:
        row.commission.state === "not-applicable"
          ? null
          : money(row.commission.amount),
      label: {
        text: formatLabel(row.commission.label, t, intlLocale),
        tone: row.commission.label.tone,
      },
    },
  }));

  // Largest first; the bar shows recorded plus estimated against the largest group.
  const groupMax = Math.max(
    1,
    ...report.groups.map((g) => g.recorded + g.estimated),
  );
  const groups: ReportGroupView[] = [...report.groups]
    .sort((a, b) => b.recorded + b.estimated - (a.recorded + a.estimated))
    .map((g) => {
      const category = categories.find((c) => c.id === g.categoryId);

      return {
        id: g.categoryId,
        name: category
          ? pickText(category.name, language).text
          : t("tourMerchant.reportGroup"),
        summary: t(
          plural.select(g.orders) === "one"
            ? "partnerReport.group.summary.one"
            : "partnerReport.group.summary.other",
          { count: g.orders, value: money(g.value) },
        ),
        commission: money(g.recorded),
        estimated: g.estimated
          ? t("partnerReport.group.estimated", { amount: money(g.estimated) })
          : null,
        recordedShare: g.recorded / groupMax,
        estimatedShare: g.estimated / groupMax,
      };
    });

  const { top, step } = chartScale(
    Math.max(...report.buckets.map((b) => b.recorded + b.estimated)),
  );
  const francs = new Intl.NumberFormat(intlLocale, {
    maximumFractionDigits: 0,
  });
  // Caps and gridlines drop "CHF": the chart subtitle names the unit once.
  const amount = new Intl.NumberFormat(intlLocale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const columnLabel = (b: ReportBucket) =>
    b.hour !== undefined
      ? `${hourLabel(b.hour)}–${hourLabel((b.hour + 1) % 24)}`
      : period === "week"
        ? formatShortDate(b.start, today, intlLocale)
        : dayRange(b, intlLocale);
  const axisLabel = (b: ReportBucket) => {
    if (b.hour !== undefined)
      return b.hour % 6 === 0 ? hourLabel(b.hour) : null;
    // Days only; the month is in the period label above.
    if (period === "month")
      return `${Number(b.start.slice(8))}–${Number(b.end.slice(8))}`;
    if (b.start === today) return t("partnerReport.chart.today");

    return new Intl.DateTimeFormat(intlLocale, {
      weekday: "short",
      timeZone: "UTC",
    }).format(new Date(`${b.start}T12:00:00Z`));
  };
  const columns = report.buckets.map((b) => {
    const label = columnLabel(b);
    const recorded = money(b.recorded);
    const estimated = money(b.estimated);
    const orders = ordersText(b.orders);

    return {
      id: `${b.start}-${b.hour ?? ""}`,
      axisLabel: axisLabel(b),
      label,
      ariaLabel: t("partnerReport.chart.column", {
        label,
        recorded,
        estimated,
        orders,
      }),
      readout: t("partnerReport.chart.readout", { recorded, estimated }),
      orders,
      // Value on the cap only when the columns are wide enough to hold it.
      cap:
        b.recorded + b.estimated && report.buckets.length <= 7
          ? amount.format((b.recorded + b.estimated) / 100)
          : null,
      recordedShare: b.recorded / top,
      estimatedShare: b.estimated / top,
      isFuture: b.isFuture,
      isCurrent: b.isCurrent,
    };
  });
  // The readout opens on the latest column with orders, else the running one.
  const latest = report.buckets.reduce(
    (found, b, i) => (!b.isFuture && b.orders ? i : found),
    -1,
  );
  const chartTitle = t(chartTitles[period]);
  const chart: ReportChartView = {
    title: chartTitle,
    label: t("partnerReport.chart.label", {
      title: chartTitle,
      range: rangeLabel,
    }),
    unit: t("partnerReport.chart.unit"),
    legend: {
      recorded: t("partnerReport.chart.recorded"),
      estimated: t("partnerReport.chart.estimated"),
    },
    ticks: Array.from({ length: top / step + 1 }, (_, i) => ({
      share: (i * step) / top,
      label: francs.format((i * step) / 100),
    })),
    columns,
    initialIndex:
      latest >= 0
        ? latest
        : Math.max(
            0,
            report.buckets.findIndex((b) => b.isCurrent),
          ),
  };

  const { recorded, estimated: open } = report.counts;
  const closed = report.counts["not-applicable"];
  const kpis: ReportKpi[] = [
    {
      id: "earned",
      label: t("partnerReport.number.earned"),
      value: money(report.earned),
      hint: report.estimated
        ? t("partnerReport.number.earned.hintEstimated", {
            amount: money(report.estimated),
          })
        : t("partnerReport.number.earned.hint"),
    },
    {
      id: "paid",
      label: t("partnerReport.number.paid"),
      value: money(report.paid),
      hint: t("partnerReport.number.paid.hint"),
    },
    {
      id: "to-pay",
      label: t("partnerReport.number.toPay"),
      value: money(report.toPay),
      hint: t("partnerReport.number.toPay.hint"),
    },
    {
      id: "orders",
      label: t("partnerReport.number.orders"),
      value: String(report.rows.length),
      hint: t(
        closed
          ? "partnerReport.number.orders.hintClosed"
          : "partnerReport.number.orders.hint",
        { completed: recorded, open, closed },
      ),
    },
  ];

  const monthName = (iso: string, opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(intlLocale, { ...opts, timeZone: "UTC" }).format(
      new Date(`${iso}T12:00:00Z`),
    );
  const allTime: AllTimeCardProps | null = allTimeData && {
    id: "report-alltime",
    title: t("partnerReport.allTime.title"),
    description: t("partnerReport.allTime.description", {
      date: monthName(allTimeData.firstDay, {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    }),
    value: money(allTimeData.earned),
    delta: (() => {
      const d = deltaOf(
        allTimeData.last30,
        allTimeData.previous30,
        "up",
        intlLocale,
      );
      const { start: from, end: to } = allTimeData.previousRange;
      const span = `${formatShortDate(from, today, intlLocale)} – ${formatShortDate(to, today, intlLocale)}`;

      return {
        text: d.delta,
        tone: d.tone,
        direction: d.direction,
        label: d.delta
          ? t("partnerReport.allTime.delta", { delta: d.delta, range: span })
          : t("partnerReport.allTime.deltaNone", { range: span }),
      };
    })(),
    sentence: t("partnerReport.allTime.sentence", {
      last: money(allTimeData.last30),
      previous: money(allTimeData.previous30),
    }),
    chart: {
      title: t("partnerReport.allTime.chart"),
      bars: allTimeData.months.map((m, i) => {
        const isCurrent = i === allTimeData.months.length - 1;

        return {
          id: m.start,
          tick: monthName(m.start, { month: "short" }),
          label: isCurrent
            ? t("partnerReport.allTime.thisMonth")
            : monthName(m.start, { month: "long", year: "numeric" }),
          value: m.earned === null ? null : m.earned / 100,
          valueText:
            m.earned === null
              ? t("partnerReport.allTime.noData")
              : money(m.earned),
          isCurrent,
        };
      }),
      tableLabels: {
        item: t("partnerReport.allTime.monthColumn"),
        value: t("partnerReport.allTime.earned"),
      },
    },
    metricsLabel: t("partnerReport.allTime.metrics"),
    metrics: [
      {
        id: "earned",
        icon: PartnersIcon,
        label: t("partnerReport.allTime.earned"),
        value: money(allTimeData.earned),
        caption: t("partnerReport.allTime.earned.caption", {
          share: share(
            allTimeData.earned,
            allTimeData.earned + allTimeData.estimated,
          ),
          total: money(allTimeData.earned + allTimeData.estimated),
        }),
        share:
          allTimeData.earned /
          Math.max(1, allTimeData.earned + allTimeData.estimated),
      },
      {
        id: "paid",
        icon: PayLaterIcon,
        label: t("partnerReport.allTime.paid"),
        value: money(allTimeData.paid),
        caption: t("partnerReport.allTime.ofEarned", {
          share: share(allTimeData.paid, allTimeData.earned),
        }),
        share: allTimeData.paid / Math.max(1, allTimeData.earned),
      },
      {
        id: "to-pay",
        icon: ClockIcon,
        label: t("partnerReport.number.toPay"),
        value: money(allTimeData.toPay),
        caption: t("partnerReport.allTime.ofEarned", {
          share: share(allTimeData.toPay, allTimeData.earned),
        }),
        share: allTimeData.toPay / Math.max(1, allTimeData.earned),
      },
    ],
  };

  return {
    allTime,
    demoNote: withHistory.length ? t("partnerReport.demoNote") : null,
    periods: REPORT_PERIODS.map((id) => ({
      id,
      label: t(periodLabels[id]),
    })),
    rangeLabel,
    previous: shiftPeriod(period, day, -1),
    // No paging into the future: the next period must have started by today.
    next:
      periodRange(period, shiftPeriod(period, day, 1)).start <= today
        ? shiftPeriod(period, day, 1)
        : null,
    isCurrent: today >= start && today <= end,
    kpis,
    chart,
    groups,
    rows,
  };
}
