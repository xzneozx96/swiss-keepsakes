import type {
  DayView,
  KpiView,
  OverviewAnalyticsView,
  ShareRow,
} from "../hooks/use-overview-analytics";
import type { PeriodId } from "../lib/analytics";
import type { ReactNode } from "react";

import { Button, Tabs } from "@heroui/react";
import { Link } from "@tanstack/react-router";
import { useId, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState } from "@/components/empty-state";
import { ReportsIcon } from "@/components/icons";
import { AllTimeCard, DeltaChip, StatCard } from "@/components/stat-card";

/** Chart tokens from theme.css (owner review 1.9t: one red-based theme); fixed per method. */
const methodColour: Record<string, string> = {
  online: "var(--chart-1)",
  cash: "var(--chart-2)",
  "bank-transfer": "var(--chart-3)",
  other: "var(--muted)",
};

const tick = { fill: "var(--muted)", fontSize: 11 };
const noAnimation = { isAnimationActive: false } as const;

/**
 * A dashboard widget after HeroUI Pro's Widget: a tinted shell with a header (title,
 * description, actions), an elevated content card, and an optional footer line.
 */
export function Widget({
  id,
  title,
  description,
  actions,
  footer,
  className = "",
  children,
}: {
  id: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className={`flex min-w-0 flex-col rounded-3xl bg-surface-secondary p-1.5 ${className}`}
    >
      <div className="flex min-h-11 items-start justify-between gap-3 px-3.5 pt-2.5 pb-2">
        <div className="flex min-w-0 flex-col">
          <h3 className="font-semibold" id={id}>
            {title}
          </h3>
          {description && (
            <p className="text-xs text-pretty text-muted">{description}</p>
          )}
        </div>
        {actions}
      </div>
      <div className="flex min-w-0 flex-1 flex-col rounded-[1.25rem] bg-surface p-4 shadow-surface">
        {children}
      </div>
      {footer && (
        <div className="px-3.5 pt-2 pb-1 text-xs text-muted">{footer}</div>
      )}
    </section>
  );
}

/** A tooltip card: the value leads in ink, the series name follows in muted text. */
export function TooltipCard({
  heading,
  rows,
}: {
  heading: string;
  rows: { key: string; colour: string; label: string; value: string }[];
}) {
  return (
    <div className="min-w-36 rounded-xl bg-overlay px-3 py-2 text-xs shadow-overlay">
      <p className="mb-1 font-medium text-muted">{heading}</p>
      {rows.map((r) => (
        <p key={r.key} className="flex items-center gap-2">
          <span
            aria-hidden
            className="h-0.5 w-3 shrink-0 rounded-full"
            style={{ background: r.colour }}
          />
          <span className="font-semibold tabular-nums">{r.value}</span>
          <span className="text-muted">{r.label}</span>
        </p>
      ))}
    </div>
  );
}

/** Sparkline: the period's daily values, no axes; decorative (the value and delta say it). */
export function Sparkline({
  values,
  colour,
  height,
}: {
  values: (number | null)[];
  colour: string;
  height: number;
}) {
  const gradient = useId();
  const data = values.map((value, index) => ({ index, value }));

  return (
    <div aria-hidden className="min-w-0" style={{ height }}>
      <ResponsiveContainer height="100%" width="100%">
        <AreaChart
          accessibilityLayer={false}
          data={data}
          margin={{ top: 4, right: 4, bottom: 0, left: 4 }}
        >
          <defs>
            <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={colour} stopOpacity={0.18} />
              <stop offset="100%" stopColor={colour} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={[0, "auto"]} />
          <Area
            {...noAnimation}
            connectNulls
            dataKey="value"
            dot={false}
            fill={`url(#${gradient})`}
            stroke={colour}
            strokeWidth={2}
            type="monotone"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const moneyKpi = (kpi: KpiView) => kpi.id !== "orders";

/** One KPI as a standalone card: label, value with the delta chip, sparkline. */
function Kpi({ kpi, isHero }: { kpi: KpiView; isHero: boolean }) {
  return (
    <StatCard
      badge={
        <DeltaChip
          direction={kpi.direction}
          label={kpi.deltaLabel}
          text={kpi.delta}
          tone={kpi.deltaTone}
        />
      }
      className={isHero ? "col-span-2" : ""}
      isLarge={isHero}
      label={kpi.label}
      value={kpi.value}
    >
      <dd className="mt-auto pt-2">
        <Sparkline
          colour={moneyKpi(kpi) ? "var(--chart-1)" : "var(--chart-2)"}
          height={isHero ? 48 : 36}
          values={kpi.trend}
        />
      </dd>
    </StatCard>
  );
}

/** The KPIs as standalone cards with gaps: 2 across on phones, 4 from 1024px (hero spans 2). */
function KpiGroup({ label, kpis }: { label: string; kpis: KpiView[] }) {
  return (
    <dl
      aria-label={label}
      className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4"
    >
      {kpis.map((kpi, index) => (
        <Kpi key={kpi.id} isHero={index === 0} kpi={kpi} />
      ))}
    </dl>
  );
}

function TableToggle({
  isTable,
  onToggle,
  labels,
}: {
  isTable: boolean;
  onToggle: () => void;
  labels: { showTable: string; showChart: string };
}) {
  return (
    <Button className="shrink-0" size="sm" variant="ghost" onPress={onToggle}>
      {isTable ? labels.showChart : labels.showTable}
    </Button>
  );
}

const tableClass =
  "w-full text-sm [&_td]:py-1.5 [&_th]:py-1.5 [&_th]:font-medium";

/**
 * Orders and payments per day: collected CHF as an area with its line, orders as bars.
 * Two panels share the day axis and one synced tooltip, so neither measure borrows the
 * other's scale (no dual axis). Today is drawn lighter: the day is still running.
 */
function TrendWidget({ trend }: { trend: OverviewAnalyticsView["trend"] }) {
  const [isTable, setTable] = useState(false);
  const sync = useId();
  const gradient = useId();
  const dense = trend.days.length > 10;
  const tooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: readonly { payload?: DayView }[];
  }) => {
    const day = payload?.[0]?.payload;

    if (!active || !day) return null;

    return (
      <TooltipCard
        heading={day.label}
        rows={[
          {
            key: "collected",
            colour: "var(--chart-1)",
            label: trend.collectedLabel,
            value: day.collectedText,
          },
          {
            key: "orders",
            colour: "var(--chart-2)",
            label: trend.ordersLabel,
            value: String(day.orders),
          },
        ]}
      />
    );
  };
  const xAxis = (show: boolean) => (
    <XAxis
      axisLine={show ? { stroke: "var(--border)" } : false}
      dataKey="tick"
      height={show ? 24 : 0}
      hide={!show}
      interval={dense ? "preserveStartEnd" : 0}
      minTickGap={8}
      tick={tick}
      tickLine={false}
    />
  );

  return (
    <Widget
      actions={
        <TableToggle
          isTable={isTable}
          labels={trend}
          onToggle={() => setTable((v) => !v)}
        />
      }
      className="lg:col-span-2"
      description={trend.description}
      id="overview-trend"
      title={trend.title}
    >
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-2.5 rounded-sm"
            style={{ background: "var(--chart-1)" }}
          />
          {trend.collectedLabel}
        </li>
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-2.5 rounded-sm"
            style={{ background: "var(--chart-2)" }}
          />
          {trend.ordersLabel}
        </li>
      </ul>
      <p className="sr-only">{trend.summary}</p>
      {isTable ? (
        <div className="max-h-80 overflow-y-auto">
          <table className={tableClass}>
            <thead className="sticky top-0 bg-surface text-xs text-muted">
              <tr>
                <th className="text-start" scope="col">
                  {trend.dayLabel}
                </th>
                <th className="text-end" scope="col">
                  {trend.collectedLabel}
                </th>
                <th className="text-end" scope="col">
                  {trend.ordersLabel}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-separator tabular-nums">
              {trend.days.map((d) => (
                <tr key={d.day}>
                  <th className="text-start font-normal" scope="row">
                    {d.label}
                  </th>
                  <td className="text-end">{d.collectedText}</td>
                  <td className="text-end">{d.orders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex min-w-0 flex-col">
          <p className="text-xs font-medium text-muted">
            {trend.collectedLabel}
          </p>
          <div className="h-44 min-w-0">
            <ResponsiveContainer height="100%" width="100%">
              <ComposedChart
                data={trend.days}
                desc={trend.summary}
                margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
                syncId={sync}
                title={trend.title}
              >
                <defs>
                  <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--chart-1)"
                      stopOpacity={0.2}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--chart-1)"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                {xAxis(false)}
                <YAxis
                  axisLine={false}
                  tick={tick}
                  tickCount={4}
                  tickLine={false}
                  width={44}
                />
                <Tooltip
                  content={tooltip}
                  cursor={{ stroke: "var(--border-tertiary)", strokeWidth: 1 }}
                />
                <Area
                  {...noAnimation}
                  activeDot={false}
                  dataKey="collected"
                  fill={`url(#${gradient})`}
                  stroke="none"
                  type="monotone"
                />
                <Line
                  {...noAnimation}
                  activeDot={{
                    r: 4,
                    fill: "var(--chart-1)",
                    stroke: "var(--surface)",
                    strokeWidth: 2,
                  }}
                  dataKey="collected"
                  dot={false}
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  type="monotone"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs font-medium text-muted">
            {trend.ordersLabel}
          </p>
          <div className="h-28 min-w-0">
            <ResponsiveContainer height="100%" width="100%">
              <ComposedChart
                accessibilityLayer={false}
                data={trend.days}
                margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
                syncId={sync}
              >
                <CartesianGrid stroke="var(--border)" vertical={false} />
                {xAxis(true)}
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tick={tick}
                  tickCount={3}
                  tickLine={false}
                  width={44}
                />
                <Tooltip
                  content={() => null}
                  cursor={{ fill: "var(--surface-secondary)" }}
                />
                <Bar
                  {...noAnimation}
                  dataKey="orders"
                  maxBarSize={20}
                  radius={[4, 4, 0, 0]}
                >
                  {trend.days.map((d) => (
                    <Cell
                      key={d.day}
                      fill="var(--chart-2)"
                      fillOpacity={d.isToday ? 0.35 : 1}
                    />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </Widget>
  );
}

/** A screen-reader table for a bar list; the visible chart carries the same numbers. */
function SrTable({
  caption,
  rows,
  labels,
}: {
  caption: string;
  rows: { id: string; label: string; value: string; share: string }[];
  labels: OverviewAnalyticsView["tableLabels"];
}) {
  // sr-only on a wrapper: a table ignores the 1px width and would widen the page with long labels.
  return (
    <div className="sr-only">
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{labels.item}</th>
            <th scope="col">{labels.value}</th>
            <th scope="col">{labels.share}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <th scope="row">{r.label}</th>
              <td>{r.value}</td>
              <td>{r.share}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const ROW = 46;

interface BarRow {
  id: string;
  label: string;
  value: number;
  valueText: string;
  share: string;
  colour: string;
  opacity?: number;
}

/**
 * A ranked bar list (Recharts, horizontal): the name above the bar on the left, the value
 * and share on the right, one thin bar per row. Hover or arrow keys show the row's tooltip.
 */
function BarList({
  rows,
  caption,
  tableLabels,
  showShare = false,
  scale,
}: {
  /** Shared scale for lists drawn against one total (the funnel); default: the largest row. */
  scale?: number;
  /** Short values (counts) have room for the share; money keeps it in the tooltip. */
  showShare?: boolean;
  rows: BarRow[];
  caption: string;
  tableLabels: OverviewAnalyticsView["tableLabels"];
}) {
  const max = scale ?? Math.max(...rows.map((r) => r.value), 0);

  return (
    <figure className="min-w-0">
      <div className="min-w-0" style={{ height: rows.length * ROW }}>
        <ResponsiveContainer height="100%" width="100%">
          <BarChart
            barCategoryGap={0}
            data={rows}
            desc={rows
              .map((r) => `${r.label}: ${r.valueText}, ${r.share}`)
              .join("; ")}
            layout="vertical"
            margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
            title={caption}
          >
            <XAxis hide domain={[0, max || 1]} type="number" />
            <YAxis hide dataKey="label" type="category" />
            <Tooltip
              content={({ active, payload }) => {
                const row = payload?.[0]?.payload as BarRow | undefined;

                if (!active || !row) return null;

                return (
                  <TooltipCard
                    heading={row.label}
                    rows={[
                      {
                        key: row.id,
                        colour: row.colour,
                        label: row.share,
                        value: row.valueText,
                      },
                    ]}
                  />
                );
              }}
              cursor={{ fill: "var(--surface-secondary)" }}
            />
            <Bar
              {...noAnimation}
              background={{ fill: "var(--chart-track)", radius: 4 }}
              barSize={8}
              dataKey="value"
              radius={4}
            >
              {rows.map((r) => (
                <Cell key={r.id} fill={r.colour} fillOpacity={r.opacity ?? 1} />
              ))}
              <LabelList
                content={(props) => {
                  const { y, index } = props;
                  const row = rows[Number(index)];
                  const top = Number(y) - 8;

                  if (!row) return null;

                  return (
                    <g>
                      <text
                        className="fill-foreground text-[13px]"
                        x={0}
                        y={top}
                      >
                        {row.label}
                      </text>
                      <text
                        className="fill-foreground text-[13px] font-medium tabular-nums"
                        textAnchor="end"
                        x="100%"
                        y={top}
                      >
                        {row.valueText}
                        {showShare && (
                          <tspan className="fill-muted font-normal">{` · ${row.share}`}</tspan>
                        )}
                      </text>
                    </g>
                  );
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <SrTable
        caption={caption}
        labels={tableLabels}
        rows={rows.map((r) => ({ ...r, value: r.valueText }))}
      />
    </figure>
  );
}

function ShareWidget({
  id,
  widget,
  colour,
  tableLabels,
  none,
}: {
  id: string;
  widget: OverviewAnalyticsView["places"];
  colour: string;
  tableLabels: OverviewAnalyticsView["tableLabels"];
  none: string;
}) {
  return (
    <Widget description={widget.description} id={id} title={widget.title}>
      <p className="mb-4 text-2xl font-semibold tracking-tight">
        {widget.total}
      </p>
      {widget.rows.length ? (
        <BarList
          caption={widget.title}
          rows={widget.rows.map((r: ShareRow) => ({ ...r, colour }))}
          tableLabels={tableLabels}
        />
      ) : (
        <p className="text-sm text-muted">{none}</p>
      )}
      {widget.rows.some((r) => r.detail) && (
        <p className="mt-1 text-xs text-muted">
          {widget.rows.map((r) => `${r.label}: ${r.detail}`).join(" · ")}
        </p>
      )}
    </Widget>
  );
}

/** Payment methods: one stacked bar (a 2px surface gap between parts) and a legend list. */
function MethodsWidget({
  widget,
  none,
}: {
  widget: OverviewAnalyticsView["methods"];
  none: string;
}) {
  const row = Object.fromEntries(widget.rows.map((r) => [r.id, r.value]));

  return (
    <Widget
      description={widget.description}
      id="overview-methods"
      title={widget.title}
    >
      <p className="mb-4 text-2xl font-semibold tracking-tight">
        {widget.total}
      </p>
      {widget.rows.length ? (
        <>
          <div className="h-4 min-w-0">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart
                barCategoryGap={0}
                data={[row]}
                layout="vertical"
                margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
              >
                <XAxis hide domain={[0, "dataMax"]} type="number" />
                <YAxis hide type="category" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;

                    return (
                      <TooltipCard
                        heading={widget.title}
                        rows={widget.rows.map((r) => ({
                          key: r.id,
                          colour: methodColour[r.id],
                          label: `${r.label} · ${r.share}`,
                          value: r.valueText,
                        }))}
                      />
                    );
                  }}
                  cursor={false}
                />
                {widget.rows.map((r, index) => (
                  <Bar
                    key={r.id}
                    {...noAnimation}
                    dataKey={r.id}
                    fill={methodColour[r.id]}
                    radius={
                      widget.rows.length === 1
                        ? 6
                        : index === 0
                          ? [6, 0, 0, 6]
                          : index === widget.rows.length - 1
                            ? [0, 6, 6, 0]
                            : 0
                    }
                    stackId="methods"
                    stroke="var(--surface)"
                    strokeWidth={2}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-4 flex flex-col divide-y divide-separator">
            {widget.rows.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-2">
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-sm"
                  style={{ background: methodColour[r.id] }}
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-medium">{r.label}</span>
                  <span className="text-xs text-muted">{r.detail}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end">
                  <span className="text-sm font-medium tabular-nums">
                    {r.valueText}
                  </span>
                  <span className="text-xs text-muted tabular-nums">
                    {r.share}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-sm text-muted">{none}</p>
      )}
    </Widget>
  );
}

/** Status funnel: the period's requests by how far they got, then the ones that stopped. */
function FunnelWidget({
  funnel,
  tableLabels,
}: {
  funnel: OverviewAnalyticsView["funnel"];
  tableLabels: OverviewAnalyticsView["tableLabels"];
}) {
  // One scale for both lists: requested = 100%. Ordinal red ramp, lost orders grey.
  const requested = funnel.steps[0]?.value ?? 0;
  const shade = [
    "var(--chart-1-dark)",
    "var(--chart-1)",
    "var(--chart-1-mid)",
    "var(--chart-1-light)",
  ];
  const rows = (lost: boolean) =>
    funnel.steps
      .filter((s) => s.isLost === lost)
      .map((s, index) => ({
        id: s.id,
        label: s.label,
        value: s.value,
        valueText: s.valueText,
        share: s.share,
        colour: lost ? "var(--chart-3)" : shade[index],
      }));

  return (
    <Widget
      description={funnel.description}
      id="overview-funnel"
      title={funnel.title}
    >
      <BarList
        showShare
        caption={funnel.title}
        rows={rows(false)}
        scale={requested}
        tableLabels={tableLabels}
      />
      <p className="mt-3 mb-2 border-t border-separator pt-3 text-xs font-medium text-muted">
        {funnel.lostLabel}
      </p>
      <BarList
        showShare
        caption={funnel.lostLabel}
        rows={rows(true)}
        scale={requested}
        tableLabels={tableLabels}
      />
    </Widget>
  );
}

export function PeriodTabs({
  period,
  periods,
  label,
  onChange,
}: {
  period: PeriodId;
  periods: { id: PeriodId; label: string }[];
  label: string;
  onChange: (id: PeriodId) => void;
}) {
  return (
    <Tabs
      className="w-full sm:w-auto"
      selectedKey={period}
      onSelectionChange={(key) => onChange(key as PeriodId)}
    >
      <Tabs.ListContainer className="sm:w-96">
        <Tabs.List aria-label={label}>
          {periods.map((p, index) => (
            <Tabs.Tab key={p.id} id={p.id}>
              {index > 0 && <Tabs.Separator />}
              {p.label}
              <Tabs.Indicator />
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs.ListContainer>
    </Tabs>
  );
}

/**
 * The Overview analytics section (step 1.9s): a period switch, the KPI group, the daily
 * orders-and-payments chart with the status funnel, then revenue by product group, payment
 * methods and top pickup places. Phones stack; from 1024px it is a widget grid.
 */
export function OverviewAnalytics(view: OverviewAnalyticsView) {
  return (
    <section
      aria-labelledby="overview-analytics"
      className="flex flex-col gap-4"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-heading" id="overview-analytics">
          {view.heading}
        </h2>
        {/* Step 5.13: the full reports (M21), on the same period. */}
        <Link
          className="shrink-0 rounded-lg text-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:focus-ring"
          search={{ period: view.period === "30d" ? undefined : view.period }}
          to="/store/reports"
        >
          {view.reportsLink}
        </Link>
      </div>
      {view.allTime && <AllTimeCard {...view.allTime} />}
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
          <KpiGroup kpis={view.kpis} label={view.kpisLabel} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <TrendWidget trend={view.trend} />
            <FunnelWidget funnel={view.funnel} tableLabels={view.tableLabels} />
            <ShareWidget
              colour="var(--chart-1)"
              id="overview-groups"
              none={view.none}
              tableLabels={view.tableLabels}
              widget={view.groups}
            />
            <MethodsWidget none={view.none} widget={view.methods} />
            <ShareWidget
              colour="var(--chart-1)"
              id="overview-places"
              none={view.none}
              tableLabels={view.tableLabels}
              widget={view.places}
            />
          </div>
          <p className="text-xs text-muted">{view.demoNote}</p>
        </>
      )}
    </section>
  );
}
