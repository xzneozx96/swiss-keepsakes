import type { DataTableColumn } from "@/components/data-table";
import type { PartnerAnalyticsView } from "@/features/merchant/partners/hooks/use-partner-analytics";

import { Skeleton } from "@heroui/react";
import { Link } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { DataTable } from "@/components/data-table";
import { HBars } from "@/features/reports/components/report-charts";
import { useReportPages } from "@/features/reports/hooks/use-report-pages";
import { EmptyState } from "@/components/empty-state";
import { ReportsIcon } from "@/components/icons";
import { DeltaChip } from "@/components/stat-card";
import { useLocale } from "@/contexts/locale-context";
import { usePartnerAnalytics } from "@/features/merchant/partners/hooks/use-partner-analytics";
import {
  TooltipCard,
  Widget,
} from "@/features/merchant/today/components/overview-analytics";
import { WidgetSkeleton } from "@/features/merchant/today/components/overview-pages";
import { useSimulatedLoading } from "@/hooks/use-simulated-loading";
import { formatMoney } from "@/lib/format";

const noAnimation = { isAnimationActive: false } as const;
const tick = { fill: "var(--muted)", fontSize: 11 };
/** A previous range that holds nothing, for "All time" (no comparison). */
const NOTHING = { start: "0000-01-01", end: "0000-01-01" };
/** Partners are categories (not keepsakes/tours, not statuses): slate, plum, ochre, grey. */
const PARTNER_COLOURS = [
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-3)",
];

type Kpi = PartnerAnalyticsView["kpis"][number];
type Day = PartnerAnalyticsView["daily"]["days"][number];
type CompareRow = PartnerAnalyticsView["compare"]["rows"][number];

/** One partner figure: its total and change, and the figure per day. */
function KpiChart({ kpi, days }: { kpi: Kpi; days: Day[] }) {
  const { t } = useLocale();
  const data = days.map((d, i) => ({ tick: d.tick, value: kpi.trend[i] ?? 0 }));

  return (
    <Widget className="h-full" id={`lab-partner-${kpi.id}`} title={kpi.label}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-2xl font-semibold tracking-tight tabular-nums">
          {kpi.value}
        </span>
        {kpi.delta && (
          <DeltaChip
            direction={kpi.direction}
            label={kpi.deltaLabel}
            text={kpi.delta}
            tone={kpi.deltaTone}
          />
        )}
        <span className="ms-auto text-xs text-muted">
          {t("reportPages.perDay")}
        </span>
      </div>
      <div className="mt-3 h-32 min-w-0">
        <ResponsiveContainer height="100%" width="100%">
          <BarChart
            accessibilityLayer={false}
            data={data}
            margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
          >
            <XAxis
              axisLine={false}
              dataKey="tick"
              interval="preserveStartEnd"
              minTickGap={12}
              tick={tick}
              tickLine={false}
            />
            <YAxis hide />
            <Bar
              {...noAnimation}
              dataKey="value"
              fill="var(--chart-1)"
              maxBarSize={18}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Widget>
  );
}

/** Loading: the four figure charts, the daily chart, and the partners compared as rows. */
function AnalyticsSkeleton() {
  const bars = (height: string, heights: number[]) => (
    <div className={`mt-4 flex items-end justify-around gap-3 ${height}`}>
      {heights.map((h, i) => (
        <Skeleton
          key={i}
          className="w-5 rounded-t-md rounded-b-none"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );

  return (
    <div aria-hidden className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <WidgetSkeleton key={i}>
            <Skeleton className="h-7 w-36 rounded-lg" />
            {bars("h-32", [40, 70, 50, 85, 60])}
          </WidgetSkeleton>
        ))}
      </div>
      <WidgetSkeleton>
        {bars("h-56", [30, 60, 45, 80, 55, 70, 40])}
      </WidgetSkeleton>
      <WidgetSkeleton>
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-1/4 rounded-lg" />
              <Skeleton className="h-4 flex-1 rounded-lg" />
              <Skeleton className="h-4 w-16 rounded-lg" />
            </div>
          ))}
        </div>
      </WidgetSkeleton>
    </div>
  );
}

/**
 * Partners › Analytics (owner review 15.10.2026): the four partner figures as charts, link opens per day by partner,
 * commission by partner, and the partners compared in a table, on the shared period.
 */
export function PartnersAnalyticsPage() {
  const isLoading = useSimulatedLoading();
  const { sales } = useReportPages();
  const { t, intlLocale } = useLocale();
  const view = usePartnerAnalytics({
    current: sales.current,
    previous: sales.previous ?? NOTHING,
  });
  const money = (rappen: number) => formatMoney(rappen / 100, intlLocale);
  const series = view.daily.series.map((s, i) => ({
    ...s,
    colour: PARTNER_COLOURS[i] ?? "var(--chart-3)",
  }));
  const tooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: readonly { payload?: Day }[];
  }) => {
    const day = payload?.[0]?.payload as Record<string, unknown> | undefined;

    if (!active || !day) return null;

    return (
      <TooltipCard
        heading={String(day.day)}
        rows={series.map((s) => ({
          key: s.id,
          colour: s.colour,
          label: s.name,
          value: String(day[s.id] ?? 0),
        }))}
      />
    );
  };
  const columns: DataTableColumn<CompareRow>[] = [
    {
      id: "partner",
      header: view.compare.columns.partner,
      isRowHeader: true,
      cellClassName: "font-medium",
      render: (r) => (
        <Link
          className="underline-offset-4 outline-none hover:underline focus-visible:focus-ring"
          params={{ partnerId: r.id }}
          to="/store/partners/$partnerId"
        >
          {r.name}
          {r.isArchived && (
            <span className="ms-2 text-xs font-normal text-muted">
              {view.compare.archived}
            </span>
          )}
        </Link>
      ),
    },
    ...(
      [
        ["opens", view.compare.columns.opens, (r: CompareRow) => r.opens],
        [
          "transactions",
          view.compare.columns.transactions,
          (r: CompareRow) => r.transactions,
        ],
        [
          "conversion",
          view.compare.columns.conversion,
          (r: CompareRow) => r.conversion,
        ],
      ] as const
    ).map(([id, header, render]) => ({
      id,
      header,
      headerClassName: "text-end",
      cellClassName: "text-end text-muted tabular-nums",
      render,
    })),
    {
      id: "commission",
      header: view.compare.columns.commission,
      headerClassName: "text-end",
      cellClassName: "text-end font-medium whitespace-nowrap tabular-nums",
      render: (r) => r.commission,
    },
  ];

  if (isLoading) return <AnalyticsSkeleton />;
  if (view.isEmpty)
    return (
      <div className="rounded-3xl bg-surface shadow-surface">
        <EmptyState icon={ReportsIcon} message={view.empty} />
      </div>
    );

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {view.kpis.map((k) => (
          <KpiChart key={k.id} days={view.daily.days} kpi={k} />
        ))}
      </div>
      <Widget
        description={view.daily.description}
        footer={view.note}
        id="lab-partner-daily"
        title={view.daily.title}
      >
        <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          {series.map((s) => (
            <li key={s.id} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="size-2.5 rounded-sm"
                style={{ background: s.colour }}
              />
              {s.name}
            </li>
          ))}
        </ul>
        <div className="h-56 min-w-0">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart
              data={view.daily.days}
              margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
              title={view.daily.title}
            >
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis
                axisLine={false}
                dataKey="tick"
                interval="preserveStartEnd"
                minTickGap={12}
                tick={tick}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tick={tick}
                tickCount={4}
                tickLine={false}
                width={32}
              />
              <Tooltip content={tooltip} cursor={false} />
              {series.map((s, i) => (
                <Bar
                  key={s.id}
                  {...noAnimation}
                  dataKey={s.id}
                  fill={s.colour}
                  maxBarSize={20}
                  radius={i === series.length - 1 ? [4, 4, 0, 0] : 0}
                  stackId="opens"
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Widget>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Widget
          className="h-full lg:col-span-5"
          description={t("reportPages.partners.commissionDescription")}
          id="lab-partner-commission"
          title={t("reportPages.partners.commissionTitle")}
        >
          <HBars
            label={t("reportPages.partners.commissionTitle")}
            parts={[
              {
                key: "commission",
                label: view.compare.columns.commission,
                colour: PARTNER_COLOURS[0],
                colourOf: (r) =>
                  PARTNER_COLOURS[
                    series.findIndex((s) => s.id === view.compare.rows[r]?.id)
                  ] ?? "var(--chart-3)",
              },
            ]}
            rows={view.compare.rows.map((r) => ({
              id: r.id,
              label: r.name,
              values: [Math.max(0, r.commissionValue)],
              texts: [r.commission],
              totalText: money(r.commissionValue),
            }))}
          />
        </Widget>
        <Widget
          className="h-full lg:col-span-7"
          description={view.compare.description}
          id="lab-partner-compare"
          title={view.compare.title}
        >
          <DataTable
            columns={columns}
            empty={{ icon: ReportsIcon, message: t("partnerAnalytics.empty") }}
            getRowId={(r) => r.id}
            label={view.compare.title}
            rows={view.compare.rows}
            variant="card"
          />
        </Widget>
      </div>
    </>
  );
}
