import type { ReportPeriod } from '../lib/report'
import type { PaymentsView } from './payments-widget'
import type { DataTableColumn } from '@/components/data-table'
import type { IconComponent } from '@/components/icons'
import type { AllTimeCardProps } from '@/components/stat-card'
import type { ShownLabel } from '@/features/orders/hooks/use-orders'

import { Button, Skeleton } from '@heroui/react'
import { useState } from 'react'

import { DataTable } from '@/components/data-table'

import { EmptyState } from '@/components/empty-state'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  OrdersIcon,
  PartnersIcon,
  PayLaterIcon,
  ReportsIcon,
} from '@/components/icons'
import { PageTabs, TabPanel } from '@/components/page-tabs'
import { AllTimeCard, StatCard } from '@/components/stat-card'
import { StatusChip } from '@/components/status-chip'
import { Widget } from '@/features/merchant/today/components/overview-analytics'
import { WidgetSkeleton } from '@/features/merchant/today/components/overview-pages'
import { PaymentsWidget } from './payments-widget'

export interface ReportKpi {
  id: 'earned' | 'paid' | 'to-pay' | 'orders'
  label: string
  value: string
  hint: string
}

export interface ReportColumnView {
  id: string
  /** Text under the column; null leaves the slot unlabelled (hours between 00, 06, 12, 18). */
  axisLabel: string | null
  /** Name in the readout: "Tue 13 Oct", "12–18 Oct", "08:00–09:00". */
  label: string
  ariaLabel: string
  /** "CHF 0.00 recorded · CHF 11.30 estimated" */
  readout: string
  orders: string
  /** Total on the column cap; null when 0 or the columns are too narrow. */
  cap: string | null
  /** Shares of the chart's top gridline, 0–1. */
  recordedShare: number
  estimatedShare: number
  /** Not drawn: no data yet, not 0. */
  isFuture: boolean
  isCurrent: boolean
}

export interface ReportChartView {
  title: string
  /** Accessible name of the plot: title and period. */
  label: string
  unit: string
  legend: { recorded: string, estimated: string }
  /** Horizontal gridlines from 0 to the top, `share` 0–1. */
  ticks: { share: number, label: string }[]
  columns: ReportColumnView[]
  /** Column the readout shows while nothing is hovered or focused. */
  initialIndex: number
}

export interface ReportGroupView {
  id: string
  name: string
  /** "3 orders · CHF 167.00" */
  summary: string
  /** Recorded commission of the group. */
  commission: string
  /** "+CHF 11.30 estimated", null when nothing is open. */
  estimated: string | null
  /** Shares of the largest group's commission, 0–1. */
  recordedShare: number
  estimatedShare: number
}

/** A transaction as the partner sees it: guest name only, no contact or custom details (AC12). */
export interface ReportRowView {
  id: string
  reference: string
  /** Order date, 13.10.2026. */
  date: string
  guestName: string
  gifts: string
  value: string
  status: ShownLabel
  /** Amount null when the order earns none (cancelled or declined). */
  commission: { amount: string | null, label: ShownLabel }
}

export interface PartnerReportProps {
  copy: {
    periodsLabel: string
    previous: string
    next: string
    numbersHeading: string
    groupsHeading: string
    transactionsHeading: string
    columns: {
      order: string
      value: string
      status: string
      commission: string
    }
    empty: string
    emptyAction: string
  }
  period: ReportPeriod
  periods: { id: ReportPeriod, label: string }[]
  rangeLabel: string
  /** False when today lies in the shown period; the empty state then offers no way back. */
  isCurrent: boolean
  canGoNext: boolean
  kpis: ReportKpi[]
  chart: ReportChartView
  groups: ReportGroupView[]
  rows: ReportRowView[]
  /** Payouts, refund adjustments and offsets in the period (step 5.7); null when none. */
  payments?: PaymentsView | null
  /** All-time commission, above and outside the period tabs; null without any orders. */
  allTime: AllTimeCardProps | null
  /** Footnote while the figures include the demo history. */
  demoNote: string | null
  isLoading: boolean
  onPeriodChange: (period: ReportPeriod) => void
  onPrevious: () => void
  onNext: () => void
}

const widget
  = 'flex min-w-0 flex-col rounded-3xl bg-surface p-5 shadow-surface'

/** The red chart tokens shared with M02 (owner review 1.9t): recorded full, estimated light. */
const recordedFill = 'bg-(--chart-1)'
const estimatedFill = 'bg-(--chart-1-light)'

const kpiIcon: Record<ReportKpi['id'], IconComponent> = {
  'earned': PartnersIcon,
  'paid': PayLaterIcon,
  'to-pay': ClockIcon,
  'orders': OrdersIcon,
}

const pct = (share: number) => `${(share * 100).toFixed(2)}%`

/** Four numbers as standalone cards: 2×2 on phones, one row from 1024px. */
function KpiBlock({ kpis, heading }: { kpis: ReportKpi[], heading: string }) {
  return (
    <section aria-labelledby="report-numbers">
      <h2 className="sr-only" id="report-numbers">
        {heading}
      </h2>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {kpis.map(k => (
          <StatCard
            key={k.id}
            isSubgrid
            icon={kpiIcon[k.id]}
            label={k.label}
            value={<span className="whitespace-nowrap">{k.value}</span>}
          >
            <dd className="text-xs text-pretty text-muted">{k.hint}</dd>
          </StatCard>
        ))}
      </dl>
    </section>
  )
}

function Legend({ legend }: { legend: ReportChartView['legend'] }) {
  return (
    <ul className="flex items-center gap-3 text-xs text-muted">
      {(
        [
          [recordedFill, legend.recorded],
          [estimatedFill, legend.estimated],
        ] as const
      ).map(([fill, text]) => (
        <li key={text} className="flex items-center gap-1.5">
          <span aria-hidden className={`size-2.5 rounded-[3px] ${fill}`} />
          {text}
        </li>
      ))}
    </ul>
  )
}

/**
 * Stacked columns: recorded (ink) under estimated (light ink), y gridlines in CHF. Hover or
 * focus a column to show its numbers in the readout above the plot; there is no floating
 * tooltip. Future columns are left empty, not drawn as 0.
 */
function CommissionChart({
  chart,
  className,
}: {
  chart: ReportChartView
  className: string
}) {
  const [active, setActive] = useState<number | null>(null)
  const shown
    = (active !== null && !chart.columns[active]?.isFuture
      ? chart.columns[active]
      : undefined) ?? chart.columns[chart.initialIndex]
  const narrow = chart.columns.length > 12
  const gap = narrow ? 'gap-0.5' : 'gap-2'

  return (
    <Widget
      className={className}
      description={chart.unit}
      id="report-chart"
      title={chart.title}
    >
      <Legend legend={chart.legend} />
      <p
        aria-live="polite"
        className="mt-3 flex min-h-10 flex-col rounded-xl bg-surface-secondary px-3 py-2 text-sm"
      >
        <span className="font-semibold">
          {shown.label}
          <span className="font-normal text-muted"> · {shown.orders}</span>
        </span>
        <span className="text-muted">{shown.readout}</span>
      </p>
      <div className="mt-8 ms-7">
        <div
          aria-label={chart.label}
          className="relative h-44"
          role="group"
          onMouseLeave={() => setActive(null)}
        >
          {chart.ticks.map(tick => (
            <div
              key={tick.share}
              aria-hidden
              className="absolute inset-x-0 border-t border-separator"
              style={{ bottom: pct(tick.share) }}
            >
              <span className="absolute -start-7 w-6 -translate-y-1/2 text-end text-xs text-muted tabular-nums">
                {tick.label}
              </span>
            </div>
          ))}
          <div className={`absolute inset-0 flex ${gap}`}>
            {chart.columns.map((col, i) => {
              const total = col.recordedShare + col.estimatedShare

              return col.isFuture
                ? (
                    <div key={col.id} aria-hidden className="flex-1" />
                  )
                : (
                    <button
                      key={col.id}
                      aria-label={col.ariaLabel}
                      className={`relative flex flex-1 justify-center rounded-md outline-none hover:bg-foreground/5 focus-visible:focus-ring ${
                        shown === col ? 'bg-foreground/5' : ''
                      }`}
                      type="button"
                      onFocus={() => setActive(i)}
                      onMouseEnter={() => setActive(i)}
                    >
                      {total > 0 && (
                        <span
                          aria-hidden
                          className="absolute bottom-0 flex w-full max-w-6 flex-col-reverse gap-0.5"
                          style={{ height: pct(total) }}
                        >
                          {col.recordedShare > 0 && (
                            <span
                              className={`min-h-0.5 ${recordedFill} ${col.estimatedShare > 0 ? '' : 'rounded-t-[4px]'}`}
                              style={{
                                flexGrow: col.recordedShare / total,
                                flexBasis: 0,
                              }}
                            />
                          )}
                          {col.estimatedShare > 0 && (
                            <span
                              className={`min-h-0.5 rounded-t-[4px] ${estimatedFill}`}
                              style={{
                                flexGrow: col.estimatedShare / total,
                                flexBasis: 0,
                              }}
                            />
                          )}
                        </span>
                      )}
                      {col.cap && (
                        <span
                          aria-hidden
                          className="absolute inset-x-0 mb-1 text-center text-xs font-medium whitespace-nowrap text-muted tabular-nums"
                          style={{ bottom: pct(total) }}
                        >
                          {col.cap}
                        </span>
                      )}
                    </button>
                  )
            })}
          </div>
        </div>
        <div aria-hidden className={`mt-2 flex ${gap}`}>
          {chart.columns.map(col => (
            <span
              key={col.id}
              className={`flex-1 text-center text-xs whitespace-nowrap ${
                col.isCurrent ? 'font-semibold text-foreground' : 'text-muted'
              } ${narrow ? 'w-0 overflow-visible' : 'min-w-0 truncate'}`}
            >
              {col.axisLabel}
            </span>
          ))}
        </div>
      </div>
    </Widget>
  )
}

/** Ranked bars: recorded plus estimated commission per group, against the largest group. */
function GroupsWidget({
  groups,
  heading,
  legend,
  className,
}: {
  groups: ReportGroupView[]
  heading: string
  legend: ReportChartView['legend']
  className: string
}) {
  return (
    <Widget className={className} id="report-groups" title={heading}>
      <Legend legend={legend} />
      <ul className="mt-4 flex flex-col gap-4">
        {groups.map(g => (
          <li key={g.id} className="flex flex-col">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate font-medium">{g.name}</span>
              <span className="shrink-0 font-semibold tabular-nums">
                {g.commission}
              </span>
            </div>
            <span
              aria-hidden
              className="mt-2 flex h-2 gap-0.5 overflow-hidden rounded-full bg-(--chart-track)"
            >
              {g.recordedShare > 0 && (
                <span
                  className={`h-full rounded-s-full ${recordedFill} ${g.estimatedShare > 0 ? '' : 'rounded-e-full'}`}
                  style={{ width: pct(g.recordedShare) }}
                />
              )}
              {g.estimatedShare > 0 && (
                <span
                  className={`h-full rounded-e-full ${estimatedFill} ${g.recordedShare > 0 ? '' : 'rounded-s-full'}`}
                  style={{ width: pct(g.estimatedShare) }}
                />
              )}
            </span>
            <span className="mt-1.5 flex flex-wrap justify-between gap-x-3 text-xs text-muted">
              <span>{g.summary}</span>
              {g.estimated && (
                <span className="tabular-nums">{g.estimated}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </Widget>
  )
}

/** Phones: one divided list. Rows open nothing; the partner sees no order detail. */
function StackedRows({
  rows,
  label,
  columns,
}: {
  rows: ReportRowView[]
  label: string
  columns: PartnerReportProps['copy']['columns']
}) {
  return (
    <ul
      aria-label={label}
      className="flex flex-col divide-y divide-separator lg:hidden"
    >
      {rows.map(row => (
        <li
          key={row.id}
          className="flex flex-col gap-2.5 py-4 first:pt-0 last:pb-0"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col">
              <span className="font-semibold">{row.guestName}</span>
              <span className="text-xs text-muted">
                {row.reference} · {row.date}
              </span>
              <span className="text-sm text-muted">{row.gifts}</span>
            </div>
            <span className="shrink-0 font-semibold tabular-nums">
              <span className="sr-only">{columns.value}: </span>
              {row.value}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 [&_svg]:shrink-0">
            <StatusChip tone={row.status.tone}>{row.status.text}</StatusChip>
            <span className="flex items-center gap-2">
              <span className="sr-only">{columns.commission}: </span>
              {row.commission.amount && (
                <span className="text-sm font-medium tabular-nums">
                  {row.commission.amount}
                </span>
              )}
              <StatusChip tone={row.commission.label.tone}>
                {row.commission.label.text}
              </StatusChip>
            </span>
          </div>
        </li>
      ))}
    </ul>
  )
}

/**
 * From 1024px: a Table of three columns. The status chip sits in the order cell, so no column
 * wraps in the three-fifths column of the bento.
 */
function RowsTable({
  rows,
  label,
  columns,
  resetKey,
}: {
  rows: ReportRowView[]
  label: string
  columns: PartnerReportProps['copy']['columns']
  resetKey: string
}) {
  const tableColumns: DataTableColumn<ReportRowView>[] = [
    {
      id: 'order',
      header: columns.order,
      isRowHeader: true,
      cellClassName: 'py-3',
      render: row => (
        <div className="flex flex-col items-start whitespace-nowrap [&_svg]:shrink-0">
          <span className="font-semibold">{row.guestName}</span>
          <span className="text-label text-muted">
            {row.reference} · {row.date}
          </span>
          <span className="text-sm text-muted">{row.gifts}</span>
          <span className="mt-2">
            <span className="sr-only">{columns.status}: </span>
            <StatusChip tone={row.status.tone}>{row.status.text}</StatusChip>
          </span>
        </div>
      ),
    },
    {
      id: 'value',
      header: columns.value,
      headerClassName: 'text-end',
      cellClassName: 'text-end align-top whitespace-nowrap tabular-nums',
      render: row => row.value,
    },
    {
      id: 'commission',
      header: columns.commission,
      cellClassName: 'align-top whitespace-nowrap',
      render: row => (
        <div className="flex flex-col items-start gap-1.5 [&_svg]:shrink-0">
          {row.commission.amount && (
            <span className="tabular-nums">{row.commission.amount}</span>
          )}
          <StatusChip tone={row.commission.label.tone}>
            {row.commission.label.text}
          </StatusChip>
        </div>
      ),
    },
  ]

  return (
    <DataTable
      cards={page => (
        <StackedRows columns={columns} label={label} rows={page} />
      )}
      columns={tableColumns}
      getRowId={row => row.id}
      label={label}
      resetKey={resetKey}
      rows={rows}
      variant="card"
    />
  )
}

const barHeights = [
  'h-1/3',
  'h-2/3',
  'h-1/2',
  'h-full',
  'h-3/5',
  'h-2/5',
  'h-4/5',
]

/** Bars of varying height on a baseline, as the commission chart. */
function ChartBarsSkeleton({ className }: { className: string }) {
  return (
    <div aria-hidden className={`flex items-end gap-2 ${className}`}>
      {barHeights.map((height, i) => (
        <Skeleton key={i} className={`flex-1 rounded-lg ${height}`} />
      ))}
    </div>
  )
}

/** The all-time card: title, the big number with its line, and the chart beside them. */
function AllTimeSkeleton() {
  return (
    <section aria-hidden className={`${widget} gap-5`}>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-40 rounded-lg" />
        <Skeleton className="h-3 w-64 max-w-full rounded-lg" />
      </div>
      <div className="grid gap-5 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:items-end">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-12 w-48 rounded-lg" />
          <Skeleton className="h-4 w-4/5 rounded-lg" />
        </div>
        <ChartBarsSkeleton className="h-40" />
      </div>
    </section>
  )
}

/** Rows of a list while loading: a name line, a detail line and an amount. */
function RowsSkeleton({ count }: { count: number }) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/2 rounded-lg" />
            <Skeleton className="h-3 w-1/3 rounded-lg" />
          </div>
          <Skeleton className="h-4 w-16 rounded-lg" />
        </div>
      ))}
    </div>
  )
}

/** The four numbers and the bento: chart and groups, then payments and transactions. */
function ReportSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-3xl bg-surface p-4 shadow-surface"
          >
            <Skeleton className="size-9 rounded-xl" />
            <Skeleton className="h-3 w-3/5 rounded-lg" />
            <Skeleton className="h-7 w-2/3 rounded-lg" />
            <Skeleton className="h-3 w-4/5 rounded-lg" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <WidgetSkeleton className="lg:col-span-3">
          <Skeleton className="h-10 w-full rounded-xl" />
          <ChartBarsSkeleton className="mt-6 h-44" />
        </WidgetSkeleton>
        <WidgetSkeleton className="lg:col-span-2">
          <RowsSkeleton count={4} />
        </WidgetSkeleton>
        <WidgetSkeleton className="lg:col-span-5 xl:col-span-2 xl:self-start">
          <RowsSkeleton count={3} />
        </WidgetSkeleton>
        <WidgetSkeleton className="lg:col-span-5 xl:col-span-3">
          <RowsSkeleton count={5} />
        </WidgetSkeleton>
      </div>
    </div>
  )
}

/**
 * P02 Partner report (spec §4.8, R15) as a dashboard after M02 Overview: period, four
 * numbers, then a bento of widgets (chart beside product groups, payments beside the
 * transactions of this partner only). A missing widget lets its neighbour take the row.
 * Read-only; nothing here opens an order.
 */
export function PartnerReport({
  copy,
  period,
  periods,
  rangeLabel,
  isCurrent,
  canGoNext,
  kpis,
  chart,
  groups,
  rows,
  payments,
  allTime,
  demoNote,
  isLoading,
  onPeriodChange,
  onPrevious,
  onNext,
}: PartnerReportProps) {
  const content = isLoading
    ? (
        <ReportSkeleton />
      )
    : rows.length
      ? (
          <div className="flex flex-col gap-4">
            <KpiBlock heading={copy.numbersHeading} kpis={kpis} />
            {/* Phones read chart, payments, groups, transactions. From 1024px groups sit beside
          the chart; from 1280px payments sit beside the transactions, whose three columns
          clip in three fifths of a narrower frame. */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
              {/* Keyed by period so a hovered column never carries over to the next period. */}
              <CommissionChart
                key={chart.label}
                chart={chart}
                className={`lg:order-1 ${groups.length ? 'lg:col-span-3' : 'lg:col-span-5'}`}
              />
              {payments && (
                <PaymentsWidget
                  className="lg:order-3 lg:col-span-5 xl:col-span-2 xl:self-start"
                  view={payments}
                />
              )}
              {groups.length > 0 && (
                <GroupsWidget
                  className="lg:order-2 lg:col-span-2"
                  groups={groups}
                  heading={copy.groupsHeading}
                  legend={chart.legend}
                />
              )}
              <Widget
                actions={(
                  <span className="mt-0.5 rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-muted tabular-nums">
                    {rows.length}
                  </span>
                )}
                className={`lg:order-4 lg:col-span-5 ${payments ? 'xl:col-span-3' : ''}`}
                id="report-transactions"
                title={copy.transactionsHeading}
              >
                {/* A new period (or a shorter list) starts again on page 1. */}
                <RowsTable
                  columns={copy.columns}
                  label={copy.transactionsHeading}
                  resetKey={`${period}|${rows.length}`}
                  rows={rows}
                />
              </Widget>
            </div>
          </div>
        )
      : (
          <div className={widget}>
            <EmptyState
              action={
                isCurrent ? undefined : { label: copy.emptyAction, to: '/partner' }
              }
              icon={ReportsIcon}
              message={copy.empty}
            />
          </div>
        )

  return (
    <div className="flex flex-col gap-6">
      {isLoading
        ? (
            <AllTimeSkeleton />
          )
        : (
            allTime && <AllTimeCard {...allTime} />
          )}
      <PageTabs
        split
        label={copy.periodsLabel}
        selected={period}
        tabs={periods.map(p => ({ id: p.id, label: p.label }))}
        trailing={(
          <div className="flex items-center justify-between gap-1 sm:justify-start">
            <Button
              isIconOnly
              aria-label={copy.previous}
              size="sm"
              variant="ghost"
              onPress={onPrevious}
            >
              <ChevronLeftIcon size={18} />
            </Button>
            <span
              aria-live="polite"
              className="min-w-0 px-1 text-center text-heading sm:order-first sm:pe-2 sm:text-start"
            >
              {rangeLabel}
            </span>
            <Button
              isIconOnly
              aria-label={copy.next}
              isDisabled={!canGoNext}
              size="sm"
              variant="ghost"
              onPress={onNext}
            >
              <ChevronRightIcon size={18} />
            </Button>
          </div>
        )}
        onSelect={onPeriodChange}
      >
        {periods.map(p => (
          <TabPanel key={p.id} className="pt-4" id={p.id}>
            {content}
          </TabPanel>
        ))}
      </PageTabs>
      {demoNote && !isLoading && (
        <p className="text-xs text-muted">{demoNote}</p>
      )}
    </div>
  )
}
