import type { ReportsView } from "../hooks/use-reports";
import type { ReportFilters } from "../lib/money";
import type { PeriodId } from "@/features/merchant/today/lib/analytics";
import type { ReactNode } from "react";

import { Button, Label, ListBox, Select, Skeleton, Tabs } from "@heroui/react";
import { useState } from "react";

import { useReports } from "../hooks/use-reports";
import { NO_FILTERS } from "../lib/money";

import { EmptyState } from "@/components/empty-state";
import { CloseIcon, FilterIcon, ReportsIcon } from "@/components/icons";
import { DeltaChip, StatCard } from "@/components/stat-card";
import { useLocale } from "@/contexts/locale-context";
import { SheetFrame } from "@/features/merchant/order-detail/components/decision-block";
import {
  PeriodTabs,
  Sparkline,
} from "@/features/merchant/today/components/overview-analytics";
import { useSimulatedLoading } from "@/hooks/use-simulated-loading";

export const REPORT_TABS = ["money", "funnel", "products", "margin"] as const;
export type ReportTab = (typeof REPORT_TABS)[number];

type FilterKey = keyof ReportFilters;
const FILTER_KEYS: FilterKey[] = ["source", "type", "group", "item"];

/** The four filters in the M08 sheet frame; applied when the sheet closes with "Show". */
function FiltersSheet({
  view,
  filters,
  onApply,
  onClose,
}: {
  view: ReportsView;
  filters: ReportFilters;
  onApply: (filters: ReportFilters) => void;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const [draft, setDraft] = useState(filters);

  return (
    <SheetFrame
      isOpen
      footer={
        <>
          <Button fullWidth onPress={() => onApply(draft)}>
            {t("reports.filter.apply")}
          </Button>
          <Button
            fullWidth
            variant="tertiary"
            onPress={() => setDraft(NO_FILTERS)}
          >
            {t("reports.filter.clear")}
          </Button>
        </>
      }
      title={t("reports.filter.title")}
      onClose={onClose}
    >
      {FILTER_KEYS.map((key) => (
        <Select
          key={key}
          className="w-full"
          selectedKey={draft[key]}
          onSelectionChange={(k) =>
            k !== null && setDraft((d) => ({ ...d, [key]: String(k) }))
          }
        >
          <Label className="text-heading">{t(`reports.filter.${key}`)}</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {view.filterOptions[key].map((o) => (
                <ListBox.Item key={o.id} id={o.id} textValue={o.label}>
                  {o.label}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      ))}
    </SheetFrame>
  );
}

/** Five standalone cards (the Overview KPI cards), each split into goods and tours. */
function MoneyTab({ view }: { view: ReportsView }) {
  const { t } = useLocale();

  if (view.money.isEmpty) {
    return (
      <div className="rounded-3xl bg-surface shadow-surface">
        <EmptyState icon={ReportsIcon} message={t("reports.empty")} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <dl
        aria-label={t("reports.money.label")}
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4"
      >
        {view.money.cards.map((card) => (
          <StatCard
            key={card.id}
            badge={<DeltaChip {...card.delta} />}
            label={card.label}
            value={card.value}
          >
            <dd className="flex flex-col gap-0.5 pt-1 text-xs text-muted tabular-nums">
              <span>{card.goods}</span>
              <span>{card.tours}</span>
            </dd>
            <dd className="mt-auto pt-2">
              <Sparkline
                colour="var(--chart-1)"
                height={36}
                values={card.trend}
              />
            </dd>
            <dd className="pt-1 text-xs text-pretty text-muted">{card.hint}</dd>
          </StatCard>
        ))}
      </dl>
      <p className="text-xs text-pretty text-muted">
        {t("reports.money.note")}
      </p>
    </div>
  );
}

/**
 * M21 Reports (spec §4.13, steps 5.9–5.12): the Overview's period tabs, a Filters sheet with
 * the active filters as removable chips, then four tabs so each view stays short on phones.
 */
export function ReportsPage({
  period,
  filters,
  tab,
  onPeriodChange,
  onFiltersChange,
  onTabChange,
  panels,
}: {
  period: PeriodId;
  filters: ReportFilters;
  tab: ReportTab;
  onPeriodChange: (period: PeriodId) => void;
  onFiltersChange: (filters: ReportFilters) => void;
  onTabChange: (tab: ReportTab) => void;
  /** Funnel, products and margin views (steps 5.10–5.12). */
  panels: Partial<Record<ReportTab, (view: ReportsView) => ReactNode>>;
}) {
  const { t } = useLocale();
  const view = useReports(period, filters);
  const isLoading = useSimulatedLoading();
  const [isFiltering, setFiltering] = useState(false);
  const active = FILTER_KEYS.filter((key) => filters[key] !== "all");
  const labelOf = (key: FilterKey) =>
    view.filterOptions[key].find((o) => o.id === filters[key])?.label ?? "";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-title">{t("reports.title")}</h1>
        <p className="text-sm text-pretty text-muted">{t("reports.intro")}</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p className="min-w-0 text-sm text-muted">{view.comparison}</p>
        {/* Period and filters both answer "what am I looking at", so they share a row. */}
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <PeriodTabs
              label={view.periodsLabel}
              period={period}
              periods={view.periods}
              onChange={onPeriodChange}
            />
          </div>
          <div className="relative shrink-0">
            <Button
              isIconOnly
              aria-label={
                active.length
                  ? t("reports.filter.buttonCount", { count: active.length })
                  : t("reports.filter.button")
              }
              className="rounded-full"
              variant={active.length ? "secondary" : "tertiary"}
              onPress={() => setFiltering(true)}
            >
              <FilterIcon size={18} />
            </Button>
            {active.length > 0 && (
              <span
                aria-hidden
                className="pointer-events-none absolute -end-1 -top-1 grid min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] leading-5 font-semibold text-accent-foreground tabular-nums"
              >
                {active.length}
              </span>
            )}
          </div>
        </div>
      </div>

      {active.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {active.map((key) => (
            <Button
              key={key}
              size="sm"
              variant="tertiary"
              onPress={() => onFiltersChange({ ...filters, [key]: "all" })}
            >
              {labelOf(key)}
              <CloseIcon
                aria-label={t("reports.filter.remove", {
                  filter: labelOf(key),
                })}
                size={14}
              />
            </Button>
          ))}
        </div>
      )}

      {/* The underline tabs of the detail screens (C15, 1.13r; DetailTabs), without
          DetailTabs' guest-bar offsets, which do not apply in the merchant frame. */}
      <Tabs
        className="w-full"
        selectedKey={tab}
        variant="secondary"
        onSelectionChange={(key) => onTabChange(key as ReportTab)}
      >
        <Tabs.ListContainer>
          <Tabs.List aria-label={t("reports.tabs.label")} className="w-full">
            {REPORT_TABS.map((id) => (
              <Tabs.Tab
                key={id}
                className="h-11 min-w-0 flex-1 px-1.5 whitespace-nowrap"
                id={id}
              >
                {t(`reports.tabs.${id}`)}
                <Tabs.Indicator />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
        {REPORT_TABS.map((id) => (
          <Tabs.Panel key={id} className="px-0 pt-5 pb-0" id={id}>
            {isLoading ? (
              <Skeleton className="h-72 rounded-3xl" />
            ) : id === "money" ? (
              <MoneyTab view={view} />
            ) : (
              (panels[id]?.(view) ?? null)
            )}
          </Tabs.Panel>
        ))}
      </Tabs>

      {isFiltering && (
        <FiltersSheet
          filters={filters}
          view={view}
          onApply={(next) => {
            onFiltersChange(next);
            setFiltering(false);
          }}
          onClose={() => setFiltering(false)}
        />
      )}
    </div>
  );
}
