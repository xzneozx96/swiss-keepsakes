import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { TooltipCard } from "@/features/merchant/today/components/overview-analytics";

const noAnimation = { isAnimationActive: false } as const;

/** Below 640px the charts switch to a stacked, label-on-top layout. */
function useIsNarrow() {
  const query = "(max-width: 639px)";
  const [isNarrow, setNarrow] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );

  useEffect(() => {
    const list = window.matchMedia(query);
    const onChange = () => setNarrow(list.matches);

    list.addEventListener("change", onChange);

    return () => list.removeEventListener("change", onChange);
  }, []);

  return isNarrow;
}

/**
 * Phones: one row per item, label and total on top, the (stacked) bar below on a light track
 * that shows the full width, so a short bar reads as a share of the whole.
 */
function StackedRows({
  rows,
}: {
  rows: {
    id: string;
    label: string;
    totalText: string;
    note?: string | null;
    parts: { key: string; share: number; colour: string }[];
  }[];
}) {
  return (
    <ul className="flex flex-col gap-3.5">
      {rows.map((r) => (
        <li key={r.id} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0">{r.label}</span>
            <span className="shrink-0 font-semibold tabular-nums">
              {r.totalText}
            </span>
          </div>
          <span
            aria-hidden
            className="flex h-2.5 gap-px rounded-full bg-(--chart-track)"
          >
            {r.parts
              .filter((p) => p.share > 0)
              .map((p) => (
                <span
                  key={p.key}
                  className="block h-full first:rounded-s-full last:rounded-e-full"
                  style={{
                    width: `${Math.max(1, p.share * 100)}%`,
                    background: p.colour,
                  }}
                />
              ))}
          </span>
          {r.note && <span className="text-xs text-muted">{r.note}</span>}
        </li>
      ))}
    </ul>
  );
}
const tick = { fill: "var(--muted)", fontSize: 11 };

export interface Slice {
  id: string;
  label: string;
  value: number;
  colour: string;
  /** The figure as shown, e.g. "CHF 1’153.00" or "17". */
  text: string;
  /** Its share in words, e.g. "73% of keepsake sales". */
  share: string;
}

/** A donut with the total in the middle and a legend that names every slice and its share. */
export function Donut({
  slices,
  centerLabel,
  centerValue,
}: {
  slices: Slice[];
  centerLabel: string;
  centerValue: string;
}) {
  const shown = slices.filter((s) => s.value > 0);

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="relative mx-auto size-48">
        <ResponsiveContainer height="100%" width="100%">
          <PieChart accessibilityLayer={false}>
            <Pie
              {...noAnimation}
              cornerRadius={5}
              data={shown}
              dataKey="value"
              endAngle={-270}
              innerRadius="74%"
              outerRadius="100%"
              paddingAngle={shown.length > 1 ? 2 : 0}
              startAngle={90}
              stroke="none"
            >
              {shown.map((s) => (
                <Cell key={s.id} fill={s.colour} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
          <span className="text-xs text-muted">{centerLabel}</span>
          <span className="text-base font-semibold tabular-nums">
            {centerValue}
          </span>
        </div>
      </div>
      {/* One full-width row per slice: name and amount on one line, the share under it. */}
      <ul className="flex flex-col divide-y divide-separator">
        {slices.map((s) => (
          <li
            key={s.id}
            className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
          >
            <span
              aria-hidden
              className="size-3 shrink-0 rounded-full"
              style={{ background: s.colour }}
            />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-medium">{s.label}</span>
              <span className="text-xs text-muted tabular-nums">{s.share}</span>
            </span>
            <span className="shrink-0 text-base font-semibold tabular-nums">
              {s.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface BarPart {
  key: string;
  label: string;
  colour: string;
  /** A colour per row instead (e.g. margin: keepsakes red, tours teal). */
  colourOf?: (rowIndex: number) => string;
}

export interface BarRow {
  id: string;
  label: string;
  /** One value per part, in the parts' order (Rappen or a count). */
  values: number[];
  /** Each value as shown, for the tooltip. */
  texts: string[];
  /** The row's total as shown at the end of the bar. */
  totalText: string;
}

/** Horizontal bars, one per row, stacked by part, the total written at the end of each bar. */
export function HBars({
  rows,
  parts,
  label,
  labelWidth = 132,
  totalWidth = 104,
}: {
  rows: BarRow[];
  parts: BarPart[];
  label: string;
  /** Room for the row names and for the totals, in px (long names: wider). */
  labelWidth?: number;
  totalWidth?: number;
}) {
  const isNarrow = useIsNarrow();
  const max = Math.max(
    1,
    ...rows.map((r) => r.values.reduce((a, v) => a + Math.max(0, v), 0)),
  );
  const data = rows.map((r) => ({
    ...Object.fromEntries(parts.map((p, i) => [p.key, r.values[i] ?? 0])),
    id: r.id,
    label: r.label,
    totalText: r.totalText,
    texts: r.texts,
  }));
  const tooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: readonly { payload?: (typeof data)[number] }[];
  }) => {
    const row = payload?.[0]?.payload;

    if (!active || !row) return null;

    return (
      <TooltipCard
        heading={row.label}
        rows={parts.map((p, i) => ({
          key: p.key,
          colour: p.colour,
          label: p.label,
          value: row.texts[i] ?? "",
        }))}
      />
    );
  };

  return (
    // Fills the card: in a bento row next to a taller card the rows grow, never the gaps.
    <div className="flex flex-1 flex-col gap-3">
      {parts.length > 1 && (
        <ul className="flex gap-4 text-xs text-muted">
          {parts.map((p) => (
            <li key={p.key} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="size-2.5 rounded-sm"
                style={{ background: p.colour }}
              />
              {p.label}
            </li>
          ))}
        </ul>
      )}
      {isNarrow ? (
        <StackedRows
          rows={rows.map((r, ri) => ({
            id: r.id,
            label: r.label,
            totalText: r.totalText,
            parts: parts.map((p, i) => ({
              key: p.key,
              share: Math.max(0, r.values[i] ?? 0) / max,
              colour: p.colourOf?.(ri) ?? p.colour,
            })),
          }))}
        />
      ) : (
        <div
          className="min-w-0 flex-1"
          style={{ minHeight: rows.length * 44 + 8 }}
        >
          {/* minHeight: a min-height parent alone leaves "100%" nothing to resolve. */}
          <ResponsiveContainer
            height="100%"
            minHeight={rows.length * 44 + 8}
            width="100%"
          >
            <BarChart
              barCategoryGap={10}
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 0, bottom: 4, left: 0 }}
              title={label}
            >
              <XAxis hide type="number" />
              <YAxis
                axisLine={false}
                dataKey="label"
                interval={0}
                tick={{ ...tick, fontSize: 12, fill: "var(--foreground)" }}
                tickLine={false}
                type="category"
                width={labelWidth}
                yAxisId="label"
              />
              {/* Every row's total in its own column, so a part at 0 never hides it. */}
              <YAxis
                axisLine={false}
                dataKey="totalText"
                interval={0}
                orientation="right"
                tick={{
                  ...tick,
                  fontSize: 12,
                  fontWeight: 600,
                  fill: "var(--foreground)",
                }}
                tickLine={false}
                type="category"
                width={totalWidth}
                yAxisId="total"
              />
              <Tooltip content={tooltip} cursor={false} />
              {parts.map((p, i) => (
                <Bar
                  key={p.key}
                  {...noAnimation}
                  dataKey={p.key}
                  fill={p.colour}
                  maxBarSize={22}
                  radius={i === parts.length - 1 ? [0, 6, 6, 0] : 0}
                  stackId="row"
                  yAxisId="label"
                >
                  {p.colourOf &&
                    data.map((row, r) => (
                      <Cell key={row.id} fill={p.colourOf?.(r)} />
                    ))}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export interface Step {
  id: string;
  label: string;
  value: number;
  text: string;
  /** Under the label: e.g. "33% dropped off". */
  note: string | null;
}

/** Columns that step down from left to right (a funnel), the count on top of each. */
export function StepColumns({
  steps,
  colour,
  label,
}: {
  steps: Step[];
  colour: string;
  label: string;
}) {
  const stepTick = ({
    x,
    y,
    payload,
  }: {
    x?: number | string;
    y?: number | string;
    payload?: { index?: number };
  }) => {
    const step = steps[payload?.index ?? 0];

    return (
      <g transform={`translate(${x ?? 0},${y ?? 0})`}>
        <text fill="var(--foreground)" fontSize={12} textAnchor="middle" y={12}>
          {step?.label}
        </text>
        {step?.note && (
          <text fill="var(--muted)" fontSize={11} textAnchor="middle" y={28}>
            {step.note}
          </text>
        )}
      </g>
    );
  };

  const isNarrow = useIsNarrow();
  const first = Math.max(1, steps[0]?.value ?? 1);

  if (isNarrow)
    return (
      <StackedRows
        rows={steps.map((s) => ({
          id: s.id,
          label: s.label,
          totalText: s.text,
          note: s.note,
          parts: [{ key: "value", share: s.value / first, colour }],
        }))}
      />
    );

  return (
    <div className="h-64 min-w-0">
      <ResponsiveContainer height="100%" width="100%">
        <BarChart
          data={steps}
          margin={{ top: 24, right: 4, bottom: 8, left: 4 }}
          title={label}
        >
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="label"
            height={40}
            interval={0}
            tick={stepTick}
            tickLine={false}
          />
          <YAxis hide />
          <Bar
            {...noAnimation}
            dataKey="value"
            fill={colour}
            maxBarSize={72}
            radius={[8, 8, 0, 0]}
          >
            <LabelList
              dataKey="text"
              fill="var(--foreground)"
              fontSize={13}
              fontWeight={600}
              position="top"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface SplitRow {
  id: string;
  label: string;
  colour: string;
  /** "CHF 1'609.00 revenue". */
  totalText: string;
  /** Rappen: costs and margin (a loss counts as 0 here; say it in `marginText`). */
  costs: number;
  margin: number;
  costsText: string;
  marginText: string;
  /** Shown instead of a bar, e.g. "No completed tour bookings in this period." */
  empty?: string;
}

/** Per row: the total on one line, a full-width bar split in costs and margin, both named below. */
export function SplitBars({
  rows,
  costsLabel,
  marginLabel,
}: {
  rows: SplitRow[];
  costsLabel: string;
  marginLabel: string;
}) {
  return (
    <ul className="flex flex-col gap-6">
      {rows.map((r) => {
        const whole = Math.max(1, r.costs + r.margin);

        return (
          <li key={r.id} className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="flex items-center gap-2 font-semibold">
                <span
                  aria-hidden
                  className="size-3 rounded-full"
                  style={{ background: r.colour }}
                />
                {r.label}
              </span>
              {!r.empty && (
                <span className="text-sm text-muted tabular-nums">
                  {r.totalText}
                </span>
              )}
            </div>
            {r.empty ? (
              <p className="text-sm text-muted">{r.empty}</p>
            ) : (
              <>
                <span aria-hidden className="flex h-4 gap-0.5">
                  <span
                    className="block h-full rounded-s-full bg-(--chart-3)"
                    style={{ width: `${(r.costs / whole) * 100}%` }}
                  />
                  <span
                    className="block h-full rounded-e-full"
                    style={{
                      width: `${(r.margin / whole) * 100}%`,
                      background: r.colour,
                    }}
                  />
                </span>
                <dl className="flex justify-between gap-3 text-sm">
                  <div className="flex flex-col">
                    <dt className="text-xs text-muted">{costsLabel}</dt>
                    <dd className="font-semibold tabular-nums">
                      {r.costsText}
                    </dd>
                  </div>
                  <div className="flex flex-col items-end text-end">
                    <dt className="text-xs text-muted">{marginLabel}</dt>
                    <dd className="font-semibold tabular-nums">
                      {r.marginText}
                    </dd>
                  </div>
                </dl>
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
