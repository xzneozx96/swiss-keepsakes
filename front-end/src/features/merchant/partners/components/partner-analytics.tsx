import type { PartnerAnalyticsView } from "../hooks/use-partner-analytics";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState } from "@/components/empty-state";
import { ReportsIcon } from "@/components/icons";
import { DeltaChip, StatCard } from "@/components/stat-card";
import {
  PeriodTabs,
  Sparkline,
  TooltipCard,
  Widget,
} from "@/features/merchant/today/components/overview-analytics";

const tick = { fill: "var(--muted)", fontSize: 11 };

/** Opens per day, one stacked colour per partner, as the Overview's daily bars. */
function DailyOpens({ daily }: { daily: PartnerAnalyticsView["daily"] }) {
  const dense = daily.days.length > 10;

  return (
    <Widget
      className="lg:col-span-2"
      description={daily.description}
      id="partner-daily"
      title={daily.title}
    >
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {daily.series.map((s) => (
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
            data={daily.days}
            margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
            title={daily.title}
          >
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              axisLine={{ stroke: "var(--border)" }}
              dataKey="tick"
              height={24}
              interval={dense ? "preserveStartEnd" : 0}
              minTickGap={8}
              tick={tick}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              tick={tick}
              tickCount={4}
              tickLine={false}
              width={36}
            />
            <Tooltip
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <TooltipCard
                    heading={String(label)}
                    rows={daily.series.map((s) => ({
                      key: s.id,
                      colour: s.colour,
                      label: s.name,
                      value: String(
                        payload.find((p) => p.dataKey === s.id)?.value ?? 0,
                      ),
                    }))}
                  />
                ) : null
              }
              cursor={{ fill: "var(--surface-secondary)" }}
            />
            {daily.series.map((s, index) => (
              <Bar
                key={s.id}
                dataKey={s.id}
                fill={s.colour}
                isAnimationActive={false}
                maxBarSize={20}
                radius={
                  index === daily.series.length - 1 ? [4, 4, 0, 0] : undefined
                }
                stackId="opens"
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Widget>
  );
}

/** Partners one under another for the period, four figures each; fits the narrow widget column. */
function ComparePartners({
  compare,
}: {
  compare: PartnerAnalyticsView["compare"];
}) {
  return (
    <Widget
      description={compare.description}
      id="partner-compare"
      title={compare.title}
    >
      <ul className="flex flex-col divide-y divide-separator">
        {compare.rows.map((r) => (
          <li
            key={r.id}
            className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0"
          >
            <p className="font-medium">
              {r.name}
              {r.isArchived && (
                <span className="ms-2 text-xs font-normal text-muted">
                  {compare.archived}
                </span>
              )}
            </p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 tabular-nums">
              {(
                [
                  [compare.columns.opens, r.opens],
                  [compare.columns.transactions, r.transactions],
                  [compare.columns.conversion, r.conversion],
                  [compare.columns.commission, r.commission],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="flex min-w-0 flex-col">
                  <dt className="text-xs text-muted">{label}</dt>
                  <dd className="text-sm font-medium whitespace-nowrap">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </Widget>
  );
}

/**
 * M15 Analytics tab (D18), built from the Overview analytics parts (1.9s/t): period tabs,
 * KPI stat cards with delta and sparkline, a widget grid. Phones stack.
 */
export function PartnerAnalytics(view: PartnerAnalyticsView) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p className="min-w-0 text-sm text-muted">{view.comparison}</p>
        <PeriodTabs
          label={view.periodsLabel}
          period={view.period}
          periods={view.periods}
          onChange={view.onPeriodChange}
        />
      </div>
      {view.isEmpty ? (
        <div className="rounded-3xl bg-surface shadow-surface">
          <EmptyState icon={ReportsIcon} message={view.empty} />
        </div>
      ) : (
        <>
          <dl
            aria-label={view.kpisLabel}
            className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4"
          >
            {view.kpis.map((kpi) => (
              <StatCard
                key={kpi.id}
                badge={
                  <DeltaChip
                    direction={kpi.direction}
                    label={kpi.deltaLabel}
                    text={kpi.delta}
                    tone={kpi.deltaTone}
                  />
                }
                label={kpi.label}
                value={kpi.value}
              >
                <dd className="mt-auto pt-2">
                  <Sparkline
                    colour={
                      kpi.id === "commission"
                        ? "var(--chart-1)"
                        : "var(--chart-2)"
                    }
                    height={36}
                    values={kpi.trend}
                  />
                </dd>
              </StatCard>
            ))}
          </dl>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <DailyOpens daily={view.daily} />
            <ComparePartners compare={view.compare} />
          </div>
          <p className="text-xs text-muted">{view.note}</p>
        </>
      )}
    </div>
  );
}
