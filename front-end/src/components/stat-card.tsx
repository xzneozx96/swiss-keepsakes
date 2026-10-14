import type { IconComponent } from "@/components/icons";
import type { ReactElement, ReactNode } from "react";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

import {
  ArrowUpRightIcon,
  TrendDownIcon,
  TrendUpIcon,
} from "@/components/icons";

const cardSurface =
  "relative min-w-0 rounded-3xl bg-surface p-4 shadow-surface";

/**
 * The link affordance on dashboard cards (owner review 1.9t): a small circle with an arrow
 * pointing up and right. Decorative; the card's link carries the accessible name.
 */
export function ArrowButton() {
  return (
    <span
      aria-hidden
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-foreground transition-colors group-hover:bg-foreground group-hover:text-background"
    >
      <ArrowUpRightIcon size={16} />
    </span>
  );
}

export interface DeltaView {
  /** "+12%", "−4%", "±0%", or "" when there is nothing to compare with. */
  text: string;
  tone: "good" | "bad" | "neutral";
  direction: "up" | "down" | "flat" | "none";
  /** Screen-reader sentence: "+12% compared with 14 Aug – 12 Sept". */
  label: string;
}

/** Change against the previous period: trend icon and percent; colour = direction × polarity. */
export function DeltaChip({ text, tone, direction, label }: DeltaView) {
  const toneClass = {
    good: "bg-success-soft text-success-soft-foreground",
    bad: "bg-danger-soft text-danger-soft-foreground",
    neutral: "bg-default text-muted",
  }[tone];
  const Icon =
    direction === "up"
      ? TrendUpIcon
      : direction === "down"
        ? TrendDownIcon
        : null;

  return (
    <span
      className={`inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-xs font-medium tabular-nums ${toneClass}`}
    >
      {Icon && <Icon aria-hidden size={14} />}
      <span aria-hidden>{text || "–"}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

export interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  icon?: IconComponent;
  /** Next to the value, e.g. a DeltaChip. */
  badge?: ReactNode;
  /** Under the value: a hint or a sparkline. Inside a `dl`, wrap it in a `dd`. */
  children?: ReactNode;
  /** A larger value: the hero KPI, or a count that is the whole message. */
  isLarge?: boolean;
  /** Muted value, e.g. a count of 0. */
  isMuted?: boolean;
  className?: string;
  /**
   * Renders the card as something else, e.g. a router link with an accessible name. The
   * inner text is then aria-hidden spans; without it the card is `dt`/`dd` inside a `dl`.
   */
  as?: (props: { className: string; children: ReactNode }) => ReactElement;
  /** Shows the round arrow button (only with `as` rendering a link). */
  isLink?: boolean;
  /**
   * Spans three rows of the parent grid's subgrid (label, value, one child), so values line
   * up along a row even when labels or hints wrap to different heights (P02).
   */
  isSubgrid?: boolean;
}

/**
 * A standalone stat card (owner review 1.9t): one card per figure on the shared surface,
 * laid out in a grid with gaps by the caller. Used by the M02 Today tiles and KPIs and the
 * P02 numbers, so they match. The label grows, so values line up along a row (with hints
 * of different heights, use `isSubgrid`).
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  badge,
  children,
  isLarge = false,
  isMuted = false,
  className = "",
  as,
  isLink = false,
  isSubgrid = false,
}: StatCardProps) {
  const Term = as ? "span" : "dt";
  const Detail = as ? "span" : "dd";
  const body = (
    <>
      <Term
        aria-hidden={as ? true : undefined}
        className="flex flex-1 flex-col text-sm font-medium text-pretty text-muted"
      >
        {(Icon || isLink) && (
          <span aria-hidden className="mb-3 flex items-start gap-2">
            {Icon && (
              <span className="flex size-9 items-center justify-center rounded-xl bg-surface-secondary text-foreground">
                <Icon size={18} />
              </span>
            )}
            {isLink && (
              <span className="ms-auto">
                <ArrowButton />
              </span>
            )}
          </span>
        )}
        {label}
      </Term>
      <Detail
        aria-hidden={as ? true : undefined}
        // A small card puts the badge under the value, so values line up along a row.
        className={
          isLarge
            ? "flex flex-wrap items-center gap-x-2 gap-y-1"
            : "flex flex-col items-start gap-1"
        }
      >
        <span
          className={`font-semibold tracking-tight ${
            isLarge ? "text-3xl" : "text-xl xl:text-2xl"
          } ${isMuted ? "text-muted" : ""}`}
        >
          {value}
        </span>
        {badge}
      </Detail>
      {children}
    </>
  );
  const layout = isSubgrid
    ? "row-span-3 grid grid-rows-subgrid content-start gap-1"
    : "flex flex-col gap-1";
  const cardClass = `${cardSurface} ${layout} ${isLink ? "group outline-none transition-colors hover:bg-surface-secondary/50 focus-visible:focus-ring" : ""} ${className}`;

  return as ? (
    as({ className: cardClass, children: body })
  ) : (
    <div className={cardClass}>{body}</div>
  );
}

export interface AllTimeBar {
  id: string;
  /** Axis label: "31/8", "Sept". */
  tick: string;
  /** Tooltip and table heading: "Week of 31 Aug", "This week". */
  label: string;
  /** null: no data yet (before the first order), so no bar is drawn. */
  value: number | null;
  valueText: string;
  isCurrent: boolean;
}

export interface AllTimeMetric {
  id: string;
  icon: IconComponent;
  label: string;
  value: string;
  /** The bar's reference in words: "81% of CHF 9,431.00 requested". */
  caption: string;
  /** 0–1. */
  share: number;
}

export interface AllTimeCardProps {
  id: string;
  title: string;
  description: string;
  value: string;
  delta: DeltaView;
  sentence: string;
  chart: {
    title: string;
    bars: AllTimeBar[];
    tableLabels: { item: string; value: string };
  };
  metricsLabel: string;
  metrics: AllTimeMetric[];
  footer?: ReactNode;
}

/**
 * The all-time summary widget (owner reference "Earning insights"): the headline total with
 * its 30-day delta and one sentence, a bar per week or month with the running one
 * highlighted, and an inset panel of three sub-figures, each with a thin meter whose
 * reference is written out. Not tied to the period switch. Colours are the chart tokens
 * in theme.css: past bars light red, the running bar and the meters full red.
 */
export function AllTimeCard({
  id,
  title,
  description,
  value,
  delta,
  sentence,
  chart,
  metricsLabel,
  metrics,
  footer,
}: AllTimeCardProps) {
  const tooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: readonly { payload?: AllTimeBar }[];
  }) => {
    const bar = payload?.[0]?.payload;

    if (!active || !bar) return null;

    return (
      <div className="rounded-xl bg-overlay px-3 py-2 text-xs shadow-overlay">
        <p className="font-medium text-muted">{bar.label}</p>
        <p className="font-semibold tabular-nums">{bar.valueText}</p>
      </div>
    );
  };

  return (
    <section
      aria-labelledby={id}
      className="flex min-w-0 flex-col gap-5 rounded-3xl bg-surface p-5 shadow-surface"
    >
      <div className="flex flex-col">
        <h3 className="font-semibold" id={id}>
          {title}
        </h3>
        <p className="text-xs text-pretty text-muted">{description}</p>
      </div>
      <div className="grid gap-5 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:items-end">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-4xl font-semibold tracking-tight md:text-5xl">
              {value}
            </span>
            <DeltaChip {...delta} />
          </p>
          <p className="max-w-prose text-sm text-pretty text-muted">
            {sentence}
          </p>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-xs font-medium text-muted">{chart.title}</p>
          <div aria-hidden className="h-32 min-w-0">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart
                accessibilityLayer={false}
                barCategoryGap="18%"
                data={chart.bars}
                margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
              >
                <XAxis
                  axisLine={false}
                  dataKey="tick"
                  interval={0}
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  tickLine={false}
                />
                <Tooltip
                  content={tooltip}
                  cursor={{ fill: "var(--surface-secondary)", radius: 8 }}
                />
                <Bar
                  dataKey="value"
                  isAnimationActive={false}
                  minPointSize={3}
                  radius={[8, 8, 8, 8]}
                >
                  {chart.bars.map((b) => (
                    <Cell
                      key={b.id}
                      fill={
                        b.isCurrent ? "var(--chart-1)" : "var(--chart-1-light)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="sr-only">
            <table>
              <caption>{chart.title}</caption>
              <thead>
                <tr>
                  <th scope="col">{chart.tableLabels.item}</th>
                  <th scope="col">{chart.tableLabels.value}</th>
                </tr>
              </thead>
              <tbody>
                {chart.bars.map((b) => (
                  <tr key={b.id}>
                    <th scope="row">{b.label}</th>
                    <td>{b.valueText}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <dl
        aria-label={metricsLabel}
        className="grid gap-4 rounded-2xl bg-surface-secondary p-4 sm:grid-cols-3"
      >
        {metrics.map((m) => {
          const Icon = m.icon;

          return (
            <div key={m.id} className="flex min-w-0 flex-col gap-2">
              <dt className="flex items-center gap-2 text-sm text-muted">
                <span
                  aria-hidden
                  className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-surface text-foreground"
                >
                  <Icon size={16} />
                </span>
                {m.label}
              </dt>
              <dd className="text-lg font-semibold tracking-tight">
                {m.value}
              </dd>
              <dd className="flex flex-col gap-1.5">
                <span
                  aria-hidden
                  className="block h-1.5 overflow-hidden rounded-full"
                  style={{ background: "var(--chart-track)" }}
                >
                  <span
                    className="block h-full rounded-full"
                    style={{
                      background: "var(--chart-1)",
                      width: `${Math.min(1, Math.max(0, m.share)) * 100}%`,
                    }}
                  />
                </span>
                <span className="text-xs text-pretty text-muted">
                  {m.caption}
                </span>
              </dd>
            </div>
          );
        })}
      </dl>
      {footer}
    </section>
  );
}
