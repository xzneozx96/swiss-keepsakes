import type { DataTableColumn } from "@/components/data-table";
import type { ReportFilters } from "@/features/reports/lib/money";
import type { ReactNode } from "react";

import { Button, Skeleton } from "@heroui/react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

import { useReportPages } from "../hooks/use-report-pages";

import { Donut, HBars, SplitBars, StepColumns } from "./report-charts";

import { DataTable } from "@/components/data-table";
import { SectionFrame } from "@/components/layout/section-frame";
import { EmptyState } from "@/components/empty-state";
import { CloseIcon, FilterIcon, ReportsIcon } from "@/components/icons";
import { Pager, usePaged } from "@/components/list-pagination";
import { useLocale } from "@/contexts/locale-context";
import {
  FigureChart,
  MIX_COLOURS,
  PeriodPicker,
  TopSellers,
  noAnimation,
} from "@/features/merchant/sales/components/sales-overview";
import { Widget } from "@/features/merchant/today/components/overview-analytics";
import { WidgetSkeleton } from "@/features/merchant/today/components/overview-pages";
import { FiltersSheet } from "@/features/reports/components/filters-sheet";
import { useSimulatedLoading } from "@/hooks/use-simulated-loading";
import { formatMoney } from "@/lib/format";

const FILTER_KEYS = ["source", "type", "group", "item"] as const;

/** Payment methods are categories, not statuses or gifts/tours: their own calm set. */
const METHOD_COLOURS: Record<string, string> = {
  online: "var(--chart-5)",
  cash: "var(--chart-6)",
  "bank-transfer": "var(--chart-7)",
  other: "var(--chart-3)",
};

/** Keepsakes only (pickup places): the red's steps, dark to light. */
const RED_STEPS = [
  "var(--chart-1-dark)",
  "var(--chart-1)",
  "var(--chart-1-mid)",
  "var(--chart-1-light)",
];

/**
 * The top of an analytics page: its question, the range it shows, the filters (Reports) and
 * the period dropdown, and the active filters as chips. Inside a ReportPagesProvider.
 */
export function AnalyticsHeader({
  question,
  withFilters = false,
}: {
  question: string;
  withFilters?: boolean;
}) {
  const { t } = useLocale();
  const data = useReportPages();
  const { sales, report, filters } = data;
  const [isFiltering, setFiltering] = useState(false);
  const active = FILTER_KEYS.filter((key) => filters[key] !== "all");
  const labelOf = (key: (typeof FILTER_KEYS)[number]) =>
    report.filterOptions[key].find((o) => o.id === filters[key])?.label ?? "";

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col">
          <h2 className="text-heading">{question}</h2>
          <p className="text-sm text-muted">
            {sales.rangeText} · {sales.comparison}
          </p>
        </div>
        <div className="flex shrink-0 items-start gap-2 self-end sm:self-auto">
          {withFilters && (
            <div className="relative">
              <Button
                aria-label={
                  active.length
                    ? t("reports.filter.buttonCount", { count: active.length })
                    : t("reports.filter.button")
                }
                className="rounded-full"
                variant={active.length ? "secondary" : "tertiary"}
                onPress={() => setFiltering(true)}
              >
                <FilterIcon aria-hidden size={18} />
                <span className="hidden sm:inline">
                  {t("reports.filter.button")}
                </span>
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
          )}
          <PeriodPicker
            custom={data.custom}
            period={data.period}
            view={sales}
            onCustom={data.setCustom}
            onPeriod={data.setPeriod}
          />
        </div>
      </div>
      {withFilters && active.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {active.map((key) => (
            <Button
              key={key}
              size="sm"
              variant="tertiary"
              onPress={() => data.setFilters({ ...filters, [key]: "all" })}
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
      {isFiltering && (
        <FiltersSheet
          filters={filters}
          view={report}
          onApply={(next: ReportFilters) => {
            data.setFilters(next);
            setFiltering(false);
          }}
          onClose={() => setFiltering(false)}
        />
      )}
    </>
  );
}

/** An analytics page in its section: the phone tabs, then the header and the page. */
export function AnalyticsPage({
  section,
  page,
  title,
  question,
  withFilters = false,
  children,
}: {
  section: "partners" | "content" | "requests" | "reports";
  page: string;
  title: string;
  question: string;
  withFilters?: boolean;
  children: ReactNode;
}) {
  return (
    <SectionFrame page={page} section={section} title={title}>
      <section className="flex flex-col gap-4">
        <AnalyticsHeader question={question} withFilters={withFilters} />
        {children}
      </section>
    </SectionFrame>
  );
}

/** Loading: as many widget shapes as the page shows. */
function PageSkeleton({ widgets }: { widgets: number }) {
  return (
    <div aria-hidden className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {Array.from({ length: widgets }, (_, i) => (
        <WidgetSkeleton key={i}>
          <Skeleton className="h-7 w-36 rounded-lg" />
          <div className="mt-4 flex h-32 items-end justify-around gap-3">
            {[40, 70, 50, 85, 60].map((h, b) => (
              <Skeleton
                key={b}
                className="w-5 rounded-t-md rounded-b-none"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </WidgetSkeleton>
      ))}
    </div>
  );
}

function useEmpty(): ReactNode | null {
  const { t } = useLocale();
  const { sales } = useReportPages();

  return sales.isEmpty ? (
    <div className="rounded-3xl bg-surface shadow-surface">
      <EmptyState icon={ReportsIcon} message={t("reports.empty")} />
    </div>
  ) : null;
}

/** Money: the six money figures as charts, then how the money was paid. */
export function ReportsMoneyPage() {
  const { t } = useLocale();
  const isLoading = useSimulatedLoading();
  const { sales } = useReportPages();
  const empty = useEmpty();

  if (isLoading) return <PageSkeleton widgets={6} />;
  if (empty) return empty;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[...sales.kpis, ...sales.extra].map((k) => (
          <FigureChart key={k.id} kpi={k} view={sales} />
        ))}
      </div>
      <Widget
        description={t("reportPages.methods.description")}
        id="lab-methods"
        title={t("reportPages.methods.title")}
      >
        {sales.methods.length ? (
          <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-[15rem_1fr]">
            <div className="relative mx-auto size-56">
              <ResponsiveContainer height="100%" width="100%">
                <PieChart accessibilityLayer={false}>
                  <Pie
                    {...noAnimation}
                    cornerRadius={6}
                    data={sales.methods.map((m) => ({
                      name: m.label,
                      value: m.share,
                    }))}
                    dataKey="value"
                    endAngle={-270}
                    innerRadius="74%"
                    outerRadius="100%"
                    paddingAngle={2}
                    startAngle={90}
                    stroke="none"
                  >
                    {sales.methods.map((m) => (
                      <Cell key={m.id} fill={METHOD_COLOURS[m.id]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xs text-muted">
                  {sales.kpis[1].label}
                </span>
                <span className="text-xl font-semibold tracking-tight tabular-nums">
                  {sales.paidTotal}
                </span>
              </div>
            </div>
            <ul className="grid grid-cols-1 gap-3">
              {sales.methods.map((m) => (
                <li
                  key={m.id}
                  className="flex flex-col gap-2.5 rounded-2xl border border-separator px-4 py-3.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 font-semibold">
                      <span
                        aria-hidden
                        className="size-2.5 rounded-full"
                        style={{ background: METHOD_COLOURS[m.id] }}
                      />
                      {m.label}
                    </span>
                    <span className="text-xl font-semibold tracking-tight tabular-nums">
                      {m.value}
                    </span>
                  </div>
                  <span
                    aria-hidden
                    className="flex h-1.5 overflow-hidden rounded-full"
                    style={{
                      background: `color-mix(in srgb, ${METHOD_COLOURS[m.id]} 16%, transparent)`,
                    }}
                  >
                    <span
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.round(m.share * 100)}%`,
                        background: METHOD_COLOURS[m.id],
                      }}
                    />
                  </span>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs text-muted tabular-nums">
                    <span>
                      {t("reportPages.ofCollected", { share: m.shareText })}
                    </span>
                    <span className="flex gap-3">
                      <span>
                        {t("salesOverview.gifts")}{" "}
                        <span className="font-medium text-foreground">
                          {m.gifts}
                        </span>
                      </span>
                      <span>
                        {t("salesOverview.tours")}{" "}
                        <span className="font-medium text-foreground">
                          {m.tours}
                        </span>
                      </span>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted">{t("reportPages.methods.none")}</p>
        )}
      </Widget>
    </>
  );
}

/**
 * Selling: the funnel as columns stepping down, how the period's sales ended (donut, status
 * colours), total sales by product group (bars), and every product sold (table).
 */
export function ReportsSalesPage() {
  const isLoading = useSimulatedLoading();
  const { report, sales, productGroups, outcomes } = useReportPages();
  const empty = useEmpty();
  const { t, intlLocale } = useLocale();
  const money = (rappen: number) => formatMoney(rappen / 100, intlLocale);
  const pct = (part: number, whole: number) =>
    new Intl.NumberFormat(intlLocale, { style: "percent" }).format(
      whole ? part / whole : 0,
    );
  const placedCount =
    outcomes.completed + outcomes.open + outcomes.lost + outcomes.noShow;

  if (isLoading) return <PageSkeleton widgets={4} />;
  if (empty) return empty;

  return (
    <>
      <Widget
        description={t("reportPages.funnel.description")}
        footer={
          report.funnel.businessOnly
            ? t("reports.funnel.businessOnly")
            : report.funnel.coverage
        }
        id="lab-funnel"
        title={t("reportPages.funnel.title")}
      >
        <StepColumns
          colour="var(--chart-1)"
          label={t("reportPages.funnel.title")}
          steps={report.funnel.rows.map((s) => ({
            id: s.id,
            label: t(`reportPages.funnel.${s.id}`),
            value: s.value,
            text: s.valueText,
            note: s.drop,
          }))}
        />
      </Widget>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Widget
          className="h-full"
          description={t("reportPages.ended.description")}
          id="lab-ended"
          title={t("reportPages.ended.title")}
        >
          <Donut
            centerLabel={t("reportPages.ended.total")}
            centerValue={String(placedCount)}
            slices={(
              [
                ["completed", "var(--status-success-fill)"],
                ["open", "var(--status-info-fill)"],
                ["lost", "var(--status-danger-fill)"],
                ["noShow", "var(--status-warning-fill)"],
              ] as const
            ).map(([id, colour]) => ({
              id,
              label: t(`reportPages.ended.${id}`),
              value: outcomes[id],
              colour,
              text: String(outcomes[id]),
              share: t("reportPages.ended.share", {
                share: pct(outcomes[id], placedCount),
              }),
            }))}
          />
        </Widget>
        <Widget
          className="h-full"
          description={t("reportPages.groups.description")}
          id="lab-groups"
          title={t("reportPages.groups.title")}
        >
          {productGroups.length ? (
            <HBars
              label={t("reportPages.groups.title")}
              parts={[
                {
                  key: "value",
                  label: t("salesOverview.value"),
                  colour: MIX_COLOURS[0],
                  colourOf: (r) =>
                    MIX_COLOURS[productGroups[r]?.kind === "tour" ? 1 : 0],
                },
              ]}
              rows={productGroups.map((g) => ({
                id: g.id,
                label: g.label,
                values: [g.amount],
                texts: [money(g.amount)],
                totalText: g.value,
              }))}
            />
          ) : (
            <p className="text-sm text-muted">{t("reports.products.none")}</p>
          )}
        </Widget>
      </div>
      <TopSellers isFull rows={sales.sellers} />
    </>
  );
}

type SourceRow = ReturnType<
  typeof useReportPages
>["report"]["funnel"]["sources"][number];
type MissingRow = ReturnType<
  typeof useReportPages
>["report"]["margin"]["missingAll"][number];

function SourcesTable({ rows }: { rows: SourceRow[] }) {
  const { t } = useLocale();
  const number = (
    id: string,
    header: string,
    render: (s: SourceRow) => ReactNode,
    cellClassName = "text-end text-muted",
  ) => ({ id, header, headerClassName: "text-end", cellClassName, render });
  const columns: DataTableColumn<SourceRow>[] = [
    {
      id: "source",
      header: t("reportPages.sources.source"),
      isRowHeader: true,
      render: (s) =>
        s.id === "direct" ? (
          s.name
        ) : (
          <Link
            className="underline-offset-4 outline-none hover:underline focus-visible:focus-ring"
            params={{ partnerId: s.id }}
            to="/store/partners/$partnerId"
          >
            {s.name}
          </Link>
        ),
    },
    number("visits", t("reports.sources.visits"), (s) => s.visits),
    number("sent", t("salesOverview.orders"), (s) => s.sent),
    number("completed", t("reports.sources.completed"), (s) => s.completed),
    number("conversion", t("reports.sources.conversion"), (s) => s.conversion),
    number(
      "value",
      t("salesOverview.value"),
      (s) => s.value,
      "text-end font-medium whitespace-nowrap",
    ),
  ];

  return (
    <DataTable
      columns={columns}
      contentClassName="min-w-[34rem]"
      getRowId={(s) => s.id}
      label={t("reportPages.sources.title")}
      rows={rows}
      variant="card"
    />
  );
}

/** The gifts and tours with missing costs, 10 to a page. */
function MissingList({ rows }: { rows: MissingRow[] }) {
  const { t } = useLocale();
  const { pageItems, pager } = usePaged(rows);

  return (
    <>
      <ul className="flex flex-col divide-y divide-separator">
        {pageItems.map((row) => (
          <li key={row.id} className="flex flex-col py-2.5">
            <span className="font-medium">
              {row.name}
              <span className="ms-2 text-xs font-normal text-muted">
                {row.ref}
              </span>
            </span>
            <span className="text-xs text-muted">
              {t("costData.missingList", { items: row.items })}
            </span>
          </li>
        ))}
      </ul>
      <Pager compact pager={pager} />
    </>
  );
}

/** Guests: sources, guest groups and pickup places. */
export function ReportsGuestsPage() {
  const isLoading = useSimulatedLoading();
  const { report, guestGroups, places, sourceSplit } = useReportPages();
  const { t, intlLocale } = useLocale();
  const money = (rappen: number) => formatMoney(rappen / 100, intlLocale);
  const mixParts = [
    { key: "gifts", label: t("salesOverview.gifts"), colour: MIX_COLOURS[0] },
    { key: "tours", label: t("salesOverview.tours"), colour: MIX_COLOURS[1] },
  ];
  const empty = useEmpty();
  const sources = report.funnel.sources;

  if (isLoading) return <PageSkeleton widgets={4} />;
  if (empty) return empty;

  return (
    <>
      <Widget
        description={t("reportPages.sources.description")}
        id="lab-sources"
        title={t("reportPages.sources.title")}
      >
        <HBars
          label={t("reportPages.sources.title")}
          parts={mixParts}
          rows={sourceSplit.map((src) => ({
            id: src.id,
            label: src.label,
            values: [src.gifts, src.tours],
            texts: [money(src.gifts), money(src.tours)],
            totalText: money(src.gifts + src.tours),
          }))}
        />
        <div className="mt-4 border-t border-separator pt-2">
          <SourcesTable rows={sources} />
        </div>
      </Widget>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Widget
          className="h-full"
          description={t("reportPages.guestGroups.description")}
          id="lab-guest-groups"
          title={t("reportPages.guestGroups.title")}
        >
          <HBars
            label={t("reportPages.guestGroups.title")}
            labelWidth={190}
            parts={mixParts}
            rows={guestGroups.map((g) => ({
              id: g.id,
              // Keepsakes and tours stay split here too; the label says why it is apart.
              label:
                g.id === "unknown"
                  ? t("reportPages.guestGroups.unknown")
                  : g.label,
              values: [g.amounts?.gifts ?? 0, g.amounts?.tours ?? 0],
              texts: [
                money(g.amounts?.gifts ?? 0),
                money(g.amounts?.tours ?? 0),
              ],
              totalText: g.value,
            }))}
          />
        </Widget>
        <Widget
          className="h-full"
          description={t("reportPages.places.description")}
          id="lab-places"
          title={t("reportPages.places.title")}
        >
          {places.length ? (
            <Donut
              centerLabel={t("salesOverview.gifts")}
              centerValue={money(places.reduce((a, p) => a + p.amount, 0))}
              slices={places.map((p, i) => ({
                id: p.id,
                label: p.label,
                value: p.amount,
                colour: RED_STEPS[i] ?? "var(--chart-1-light)",
                text: p.value,
                share: `${p.shareText} · ${p.detail}`,
              }))}
            />
          ) : (
            <p className="text-sm text-muted">{t("reportPages.places.none")}</p>
          )}
        </Widget>
      </div>
    </>
  );
}

/**
 * Margin: what is left after costs, from sales with every cost entered only (R14), gifts and
 * tours apart in their colours, and every sale still missing costs, 10 to a page.
 */
export function ReportsMarginPage() {
  const isLoading = useSimulatedLoading();
  const { report } = useReportPages();
  const { t, intlLocale } = useLocale();
  const m = report.margin;

  if (isLoading) return <PageSkeleton widgets={2} />;
  if (!m.summary)
    return (
      <div className="rounded-3xl bg-surface shadow-surface">
        <EmptyState icon={ReportsIcon} message={t("reports.margin.empty")} />
      </div>
    );

  const withData = m.parts
    .map((part, i) => ({ part, i }))
    .filter(({ part }) => part.hasData);
  const completed = m.parts.reduce((a, p) => a + p.sales, 0);
  const complete = m.parts.reduce((a, p) => a + p.complete, 0);
  const pct = (part: number, whole: number) =>
    new Intl.NumberFormat(intlLocale, { style: "percent" }).format(
      whole ? part / whole : 0,
    );

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Widget
          className="h-full lg:col-span-7"
          description={t("reportPages.margin.splitDescription")}
          footer={t("reports.margin.rule")}
          id="lab-margin-split"
          title={t("reportPages.margin.splitTitle")}
        >
          {withData.length ? (
            <SplitBars
              costsLabel={t("reportPages.margin.costs")}
              marginLabel={t("reportPages.margin.margin")}
              rows={m.parts.map((part, i) => ({
                id: part.id,
                label: part.label,
                colour: MIX_COLOURS[i],
                totalText: t("reportPages.margin.revenue", {
                  amount: part.revenue,
                }),
                costs: part.amounts.costs,
                margin: Math.max(0, part.amounts.margin),
                costsText: part.costs,
                // A loss is said in words: the bar cannot show a margin below zero.
                marginText:
                  part.amounts.margin < 0
                    ? t("reportPages.margin.loss", { amount: part.value })
                    : t("reportPages.margin.rate", {
                        amount: part.value,
                        rate: part.rate,
                      }),
                empty: part.hasData
                  ? undefined
                  : part.sales === 0 && part.id === "tours"
                    ? t("reportPages.margin.noTours")
                    : t("reports.margin.noData"),
              }))}
            />
          ) : (
            <p className="text-sm text-muted">{t("reports.margin.noData")}</p>
          )}
        </Widget>
        <Widget
          className="h-full lg:col-span-5"
          description={t("reportPages.margin.coverageDescription")}
          id="lab-margin-coverage"
          title={t("reportPages.margin.coverageTitle")}
        >
          <Donut
            centerLabel={t("reportPages.margin.completed")}
            centerValue={String(completed)}
            slices={[
              {
                id: "complete",
                label: t("reportPages.margin.complete"),
                value: complete,
                colour: "var(--status-success-fill)",
                text: String(complete),
                share: t("reportPages.margin.share", {
                  share: pct(complete, completed),
                }),
              },
              {
                id: "missing",
                label: t("reportPages.margin.missing"),
                value: completed - complete,
                colour: "var(--status-warning-fill)",
                text: String(completed - complete),
                share: t("reportPages.margin.share", {
                  share: pct(completed - complete, completed),
                }),
              },
            ]}
          />
        </Widget>
      </div>
      {m.missingCount > 0 && (
        <Widget
          actions={
            <Link
              className="inline-flex h-8 shrink-0 items-center gap-0.5 rounded-md text-xs font-medium text-muted outline-none hover:text-foreground focus-visible:focus-ring active:opacity-60"
              to="/store/reports/costs"
            >
              {t("reports.margin.enterCosts")}
            </Link>
          }
          description={t("reports.margin.missingDescription", {
            count: m.missingCount,
          })}
          id="lab-margin-missing"
          title={t("reportPages.margin.missingTitle")}
        >
          <MissingList rows={m.missingAll} />
        </Widget>
      )}
    </>
  );
}

/** Content › Analytics: reads per article (bars), then every article's reads and clicks. */
export function ContentAnalyticsPage() {
  const isLoading = useSimulatedLoading();
  const { report } = useReportPages();
  const { t } = useLocale();
  const articles = report.products.articles;

  if (isLoading) return <PageSkeleton widgets={2} />;

  return (
    <>
      <Widget
        description={t("reportPages.reads.description")}
        id="lab-reads"
        title={t("reportPages.reads.title")}
      >
        {articles.length ? (
          <HBars
            label={t("reportPages.reads.title")}
            labelWidth={240}
            parts={[
              {
                key: "reads",
                label: t("reportPages.content.reads"),
                colour: "var(--chart-1)",
              },
            ]}
            rows={articles.map((a) => ({
              id: a.id,
              label: a.title,
              values: [a.viewsValue],
              texts: [a.views],
              totalText: t("reportPages.reads.line", {
                reads: a.views,
                clicks: a.clicks,
              }),
            }))}
            totalWidth={150}
          />
        ) : (
          <p className="text-sm text-muted">{t("reports.content.none")}</p>
        )}
      </Widget>
      <Widget
        description={t("reports.content.description")}
        id="lab-articles"
        title={t("reports.content.title")}
      >
        <DataTable
          columns={[
            {
              id: "article",
              header: t("reportPages.content.article"),
              isRowHeader: true,
              cellClassName: "font-medium",
              render: (a) => (
                <>
                  {a.title}
                  <span className="ms-2 text-xs font-normal text-muted">
                    {a.language}
                  </span>
                </>
              ),
            },
            {
              id: "reads",
              header: t("reportPages.content.reads"),
              headerClassName: "text-end",
              cellClassName: "text-end text-muted tabular-nums",
              render: (a) => a.views,
            },
            {
              id: "clicks",
              header: t("reportPages.content.clicks"),
              headerClassName: "hidden text-end sm:table-cell",
              cellClassName:
                "hidden text-end text-muted tabular-nums sm:table-cell",
              render: (a) => a.clicks,
            },
            {
              id: "rate",
              header: t("reportPages.content.rate"),
              headerClassName: "text-end",
              cellClassName: "text-end font-medium tabular-nums",
              render: (a) => a.rate,
            },
          ]}
          empty={{ icon: ReportsIcon, message: t("reports.content.none") }}
          getRowId={(a) => a.id}
          label={t("reports.content.title")}
          rows={articles}
          variant="card"
        />
      </Widget>
    </>
  );
}

/** Inquiries › Analytics: the advice questionnaire funnel, then the requests and replies. */
export function InquiriesAnalyticsPage() {
  const isLoading = useSimulatedLoading();
  const { report, inquiries } = useReportPages();
  const { t, intlLocale } = useLocale();
  const pct = (part: number, whole: number) =>
    new Intl.NumberFormat(intlLocale, { style: "percent" }).format(
      whole ? part / whole : 0,
    );
  const advice = inquiries.advice;
  const privateTours = inquiries.privateTours;

  if (isLoading) return <PageSkeleton widgets={3} />;

  return (
    <>
      <Widget
        description={t("reportPages.advice.description")}
        id="lab-advice-funnel"
        title={t("reportPages.advice.title")}
      >
        <StepColumns
          colour="var(--chart-1)"
          label={t("reportPages.advice.title")}
          steps={report.products.widget.map((w, i) => ({
            id: w.id,
            label:
              [
                t("reportPages.advice.opened"),
                t("reportPages.advice.started"),
                t("reportPages.advice.sent"),
              ][i] ?? w.label,
            value: Number(String(w.value).replace(/\D/g, "")) || 0,
            text: String(w.value),
            note: null,
          }))}
        />
      </Widget>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Widget
          className="h-full"
          description={t("reportPages.advice.requestsDescription")}
          id="lab-advice-requests"
          title={t("reportPages.advice.requests")}
        >
          <Donut
            centerLabel={t("reportPages.advice.received")}
            centerValue={String(advice.read + advice.unread)}
            slices={[
              {
                id: "unread",
                label: t("reportPages.advice.unread"),
                value: advice.unread,
                colour: "var(--status-warning-fill)",
                text: String(advice.unread),
                share: t("reportPages.advice.share", {
                  share: pct(advice.unread, advice.read + advice.unread),
                }),
              },
              {
                id: "read",
                label: t("reportPages.advice.read"),
                value: advice.read,
                colour: "var(--status-success-fill)",
                text: String(advice.read),
                share: t("reportPages.advice.share", {
                  share: pct(advice.read, advice.read + advice.unread),
                }),
              },
            ]}
          />
        </Widget>
        <Widget
          className="h-full"
          description={t("reportPages.privateTours.description")}
          footer={t(
            privateTours.guests === 1
              ? "reportPages.privateTours.guests.one"
              : "reportPages.privateTours.guests.other",
            { count: privateTours.guests },
          )}
          id="lab-private-tours"
          title={t("reportPages.privateTours.title")}
        >
          <Donut
            centerLabel={t("reportPages.advice.received")}
            centerValue={String(privateTours.answered + privateTours.waiting)}
            slices={[
              {
                id: "waiting",
                label: t("reportPages.privateTours.waiting"),
                value: privateTours.waiting,
                colour: "var(--status-warning-fill)",
                text: String(privateTours.waiting),
                share: t("reportPages.advice.share", {
                  share: pct(
                    privateTours.waiting,
                    privateTours.answered + privateTours.waiting,
                  ),
                }),
              },
              {
                id: "answered",
                label: t("reportPages.privateTours.answered"),
                value: privateTours.answered,
                colour: "var(--status-success-fill)",
                text: String(privateTours.answered),
                share: t("reportPages.advice.share", {
                  share: pct(
                    privateTours.answered,
                    privateTours.answered + privateTours.waiting,
                  ),
                }),
              },
            ]}
          />
        </Widget>
      </div>
    </>
  );
}
