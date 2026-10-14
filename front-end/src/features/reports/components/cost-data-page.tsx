import type { CostFilter, CostRow, CostWeek } from "../hooks/use-cost-data";

import { Button, Skeleton, Tag, TagGroup } from "@heroui/react";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useCostData } from "../hooks/use-cost-data";

import { CostSheet } from "./cost-sheet";

import { EmptyState } from "@/components/empty-state";
import { CloseIcon, ReportsIcon } from "@/components/icons";
import { Media } from "@/components/media";
import { StatusChip } from "@/components/status-chip";
import { useLocale } from "@/contexts/locale-context";
import {
  TooltipCard,
  Widget,
} from "@/features/merchant/today/components/overview-analytics";
import { useSimulatedLoading } from "@/hooks/use-simulated-loading";

/** P02's recorded/estimated pair (1.17r): full chart colour for complete, light for missing. */
const COMPLETE = "var(--chart-1)";
const MISSING = "var(--chart-1-light)";
const tick = { fill: "var(--muted)", fontSize: 11 };

/**
 * Completed sales per week, split into complete and missing cost data (owner, 14 Oct 2026:
 * a chart instead of the progress bar). Tapping a week narrows the list to it; tapping it
 * again shows every week. Bars are buttons for keyboard users too.
 */
function WeeksChart({
  weeks,
  selected,
  summary,
  labels,
  onSelect,
}: {
  weeks: CostWeek[];
  selected: string | null;
  summary: string;
  labels: { title: string; complete: string; missing: string; hint: string };
  onSelect: (week: string | null) => void;
}) {
  const toggle = (week: string) => onSelect(selected === week ? null : week);

  return (
    <Widget description={summary} id="cost-weeks" title={labels.title}>
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {[
          [COMPLETE, labels.complete],
          [MISSING, labels.missing],
        ].map(([colour, text]) => (
          <li key={text} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-2.5 rounded-sm"
              style={{ background: colour }}
            />
            {text}
          </li>
        ))}
      </ul>
      <div aria-hidden className="h-44 min-w-0">
        <ResponsiveContainer height="100%" width="100%">
          <BarChart
            data={weeks}
            margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
          >
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              axisLine={{ stroke: "var(--border)" }}
              dataKey="label"
              height={24}
              interval={0}
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
            <Tooltip
              content={({ active, payload }) => {
                const w = payload?.[0]?.payload as CostWeek | undefined;

                return active && w ? (
                  <TooltipCard
                    heading={w.label}
                    rows={[
                      {
                        key: "complete",
                        colour: COMPLETE,
                        label: labels.complete,
                        value: String(w.complete),
                      },
                      {
                        key: "missing",
                        colour: MISSING,
                        label: labels.missing,
                        value: String(w.missing),
                      },
                    ]}
                  />
                ) : null;
              }}
              cursor={{ fill: "var(--surface-secondary)" }}
            />
            {(["complete", "missing"] as const).map((key) => (
              <Bar
                key={key}
                className="cursor-pointer"
                dataKey={key}
                fill={key === "complete" ? COMPLETE : MISSING}
                isAnimationActive={false}
                maxBarSize={28}
                radius={key === "missing" ? [4, 4, 0, 0] : undefined}
                stackId="week"
                onClick={(_, index) => toggle(weeks[index].week)}
              >
                {weeks.map((w) => (
                  <Cell
                    key={w.week}
                    fillOpacity={!selected || selected === w.week ? 1 : 0.3}
                  />
                ))}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* The same choice for keyboard and screen-reader users. */}
      <div
        aria-label={labels.title}
        className="mt-3 flex flex-wrap gap-1.5"
        role="group"
      >
        {weeks.map((w) => (
          <button
            key={w.week}
            aria-pressed={selected === w.week}
            className={`rounded-full px-2.5 py-1 text-xs tabular-nums outline-none focus-visible:focus-ring ${
              selected === w.week
                ? "bg-foreground text-background"
                : "bg-surface-secondary text-muted hover:text-foreground"
            }`}
            type="button"
            onClick={() => toggle(w.week)}
          >
            {w.label}
            {w.missing > 0 && (
              <span className="ms-1 font-semibold text-warning">
                {w.missing}
              </span>
            )}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">{labels.hint}</p>
    </Widget>
  );
}

/** One sale in the M03 card shape: photo, what was sold, to whom, when, for how much. */
function CostItem({ row, onOpen }: { row: CostRow; onOpen: () => void }) {
  const { t } = useLocale();

  return (
    <li className="flex flex-col gap-3 py-4">
      <div className="flex items-start gap-3">
        <Media
          alt=""
          className="size-14 shrink-0 rounded-lg"
          photo={row.photo}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="leading-snug font-semibold">
              {row.title}
              {row.more && (
                <span className="ms-1 font-normal text-muted">{row.more}</span>
              )}
            </p>
            <span className="shrink-0 font-semibold tabular-nums">
              {row.value}
            </span>
          </div>
          <p className="text-sm text-muted">
            {row.guest ? `${row.guest} · ${row.date}` : row.date}
          </p>
          <a
            className="w-fit rounded text-xs text-muted underline-offset-4 outline-none hover:underline focus-visible:focus-ring"
            href={row.href}
          >
            {row.ref}
          </a>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 [&_svg]:shrink-0">
        <StatusChip tone={row.state.tone}>{row.state.text}</StatusChip>
        <Button
          size="sm"
          variant={row.missing.length ? "primary" : "tertiary"}
          onPress={onOpen}
        >
          {t(row.missing.length ? "costData.enter" : "costData.edit")}
        </Button>
      </div>
      {row.missing.length > 0 && (
        <p className="text-xs text-muted">
          {t("costData.missingList", {
            items: row.missing
              .map((type) => t(`costData.type.${type}`))
              .join(", "),
          })}
        </p>
      )}
    </li>
  );
}

/**
 * M24 Cost data (spec §4.13, R14, step 5.8): why it exists in one sentence, the weekly
 * completeness chart, the filter chips, then completed sales as M03-style rows; each opens
 * the cost sheet. Margin is only calculated for complete sales (step 5.12).
 */
export function CostDataPage({
  filter,
  week,
  onFilterChange,
  onWeekChange,
}: {
  filter: CostFilter;
  week: string | null;
  onFilterChange: (filter: CostFilter) => void;
  onWeekChange: (week: string | null) => void;
}) {
  const { t } = useLocale();
  const { rows, filters, weeks, weekLabel, complete, total } = useCostData(
    filter,
    week,
  );
  const isLoading = useSimulatedLoading();
  const [open, setOpen] = useState<CostRow | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-title">{t("costData.title")}</h1>
        <p className="text-sm text-pretty text-muted">{t("costData.intro")}</p>
      </div>

      <WeeksChart
        labels={{
          title: t("costData.chart.title"),
          complete: t("costData.chart.complete"),
          missing: t("costData.chart.missing"),
          hint: t("costData.chart.hint"),
        }}
        selected={week}
        summary={t("costData.meter", { complete, total })}
        weeks={weeks}
        onSelect={onWeekChange}
      />

      <div className="flex flex-wrap items-center gap-1.5">
        <TagGroup
          aria-label={t("costData.filtersLabel")}
          selectedKeys={new Set([filter])}
          selectionMode="single"
          onSelectionChange={(keys) => {
            const [next] = [...keys];

            if (next) onFilterChange(next as CostFilter);
          }}
        >
          <TagGroup.List className="flex-wrap gap-1.5">
            {filters.map((f) => (
              <Tag key={f.id} id={f.id}>
                {f.label}
                <span className="ms-1 tabular-nums opacity-70">{f.count}</span>
              </Tag>
            ))}
          </TagGroup.List>
        </TagGroup>
        {weekLabel && (
          <Button
            size="sm"
            variant="tertiary"
            onPress={() => onWeekChange(null)}
          >
            {t("costData.weekOf", { week: weekLabel })}
            <CloseIcon aria-label={t("costData.clearWeek")} size={14} />
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 rounded-3xl" />
          ))}
        </div>
      ) : rows.length ? (
        <ul
          aria-label={t("costData.title")}
          className="flex flex-col divide-y divide-separator rounded-3xl bg-surface px-4 shadow-surface"
        >
          {rows.map((row) => (
            <CostItem key={row.key} row={row} onOpen={() => setOpen(row)} />
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={ReportsIcon}
          message={t(
            filter === "missing" ? "costData.emptyMissing" : "costData.empty",
          )}
        />
      )}

      {open && <CostSheet row={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
