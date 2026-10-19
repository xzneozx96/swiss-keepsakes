import type { DayRange, SalesPeriodId } from '@sk/domain/reporting'
import type { DashRow } from '../hooks/use-partner-dashboard'
import type {
  PartnerOverviewView,
  SingleFigure,
} from '../hooks/use-partner-overview'
import type { DataTableColumn } from '@/components/data-table'
import type { FilterGroup } from '@/components/filter-bar'

import { Skeleton } from '@heroui/react'
import { numberFormat } from '@sk/domain/shared'
import { useState } from 'react'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { DataTable } from '@/components/data-table'

import { EmptyState } from '@/components/empty-state'
import { filterGroup, FilterToolbar } from '@/components/filter-bar'
import { ReportsIcon } from '@/components/icons'
import { DeltaChip } from '@/components/stat-card'
import { StatusChip } from '@/components/status-chip'
import { useLocale } from '@/contexts/locale-context'
import {
  FigureChart,
  noAnimation,
  PeriodPicker,
} from '@/features/merchant/sales/components/sales-overview'
import {
  TooltipCard,
  Widget,
} from '@/features/merchant/today/components/overview-analytics'
import { WidgetSkeleton } from '@/features/merchant/today/components/overview-pages'
import { avatarUrl } from '@/lib/avatars'
import { BalanceHero, MixWidget, MonthsWidget } from './dashboard-widgets'
import { PaymentsWidget } from './payments-widget'

type CommissionFilter = 'recorded' | 'estimated' | 'none'

const tick = { fill: 'var(--muted)', fontSize: 11 }
/** Paid out and still owed are one amount per bar: the red ramp of the other analytics screens. */
const SINGLE_COLOUR = {
  'paid': 'var(--chart-1)',
  'to-pay': 'var(--chart-1-mid)',
} as const

/** "none" covers both orders that earn nothing yet and orders that never will. */
function filterOf(row: DashRow): CommissionFilter {
  return row.state === 'recorded' || row.state === 'estimated' ? row.state : 'none'
}

/**
 * A figure that is one amount per bar (paid out, still owed), in the frame of the stacked
 * `FigureChart` beside it: the total and change, a note, the bars, what they count.
 */
function SingleFigureChart({
  figure,
  bucketLabel,
}: {
  figure: SingleFigure
  bucketLabel: string
}) {
  const { t, intlLocale } = useLocale()
  const compact = numberFormat(intlLocale, {
    notation: 'compact',
    maximumFractionDigits: 1,
  })
  const colour = SINGLE_COLOUR[figure.id]
  const tooltip = ({
    active,
    payload,
  }: {
    active?: boolean
    payload?: readonly { payload?: SingleFigure['bars'][number] }[]
  }) => {
    const bar = payload?.[0]?.payload

    if (!active || !bar)
      return null

    return (
      <TooltipCard
        heading={bar.heading}
        rows={[
          {
            key: 'value',
            colour,
            label: t(
              figure.id === 'paid'
                ? 'partnerDash.fig.amount'
                : 'partnerDash.fig.balance',
            ),
            value: bar.valueText,
          },
        ]}
      />
    )
  }

  return (
    <Widget
      className="h-full"
      description={figure.note}
      footer={figure.hint}
      id={`partner-fig-${figure.id}`}
      title={figure.label}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-2xl font-semibold tracking-tight tabular-nums">
          {figure.value}
        </span>
        {figure.delta && <DeltaChip {...figure.delta} />}
        <span className="ms-auto text-xs text-muted">{bucketLabel}</span>
      </div>
      <div className="mt-3 h-40 min-w-0">
        <ResponsiveContainer height="100%" width="100%">
          <BarChart
            data={figure.bars}
            margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
            title={`${figure.label} ${bucketLabel}`}
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
              axisLine={false}
              tick={tick}
              tickCount={4}
              tickFormatter={(v: number) => compact.format(v / 100)}
              tickLine={false}
              width={40}
            />
            <Tooltip content={tooltip} cursor={false} />
            <Bar
              {...noAnimation}
              dataKey="value"
              maxBarSize={24}
              radius={[6, 6, 6, 6]}
            >
              {figure.bars.map(b => (
                <Cell
                  key={b.key}
                  fill={colour}
                  fillOpacity={b.partial ? 0.45 : 1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Widget>
  )
}

/** A transaction as a card, on phones: guest photo and name, what they bought, value, commission. */
function GuestCard({ row }: { row: DashRow }) {
  const { t } = useLocale()

  return (
    <li className="flex min-w-0 flex-col gap-3 rounded-2xl border border-separator p-4">
      <div className="flex items-start gap-3">
        <img
          alt=""
          className="size-10 shrink-0 rounded-full bg-default object-cover"
          decoding="async"
          loading="lazy"
          src={avatarUrl(row.guestName)}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-semibold">{row.guestName}</span>
          <span className="text-xs text-muted tabular-nums">
            {row.reference} · {row.date}
          </span>
        </div>
        <span
          className={`shrink-0 text-lg font-semibold tabular-nums ${row.commission.amount ? '' : 'text-muted'}`}
        >
          {row.commission.amount ?? '–'}
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-3 rounded-xl bg-surface-secondary px-3 py-2 text-sm">
        <span className="min-w-0 truncate">{row.gifts}</span>
        <span className="shrink-0 tabular-nums">
          <span className="sr-only">{t('partnerDash.guests.value')}: </span>
          {row.value}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 [&_svg]:shrink-0">
        <StatusChip tone={row.status.tone}>{row.status.text}</StatusChip>
        <StatusChip tone={row.commission.label.tone}>
          {row.commission.label.text}
        </StatusChip>
      </div>
    </li>
  )
}

/**
 * The transactions of the period as the original table (guest, value, status, commission),
 * now with the guest's photo; phones get the cards. The commission filter sits above.
 */
function TransactionsWidget({
  rows,
  resetKey,
  className,
}: {
  rows: DashRow[]
  resetKey: string
  className: string
}) {
  const { t } = useLocale()
  const [filter, setFilter] = useState<CommissionFilter[]>([])
  const shown = filter.length
    ? rows.filter(r => filter.includes(filterOf(r)))
    : rows
  const count = (id: CommissionFilter) =>
    rows.filter(r => filterOf(r) === id).length
  const groups: FilterGroup[] = [
    filterGroup<CommissionFilter>({
      id: 'commission',
      label: t('partnerDash.filter.label'),
      options: (['recorded', 'estimated', 'none'] as const).map(id => ({
        id,
        label: t(`partnerDash.filter.${id}`),
        count: count(id),
      })),
      selected: filter,
      onChange: setFilter,
    }),
  ]
  const columns: DataTableColumn<DashRow>[] = [
    {
      id: 'order',
      header: t('partnerReport.column.order'),
      isRowHeader: true,
      render: r => (
        <div className="flex items-start gap-3 py-1">
          <img
            alt=""
            className="size-10 shrink-0 rounded-full bg-default object-cover"
            decoding="async"
            loading="lazy"
            src={avatarUrl(r.guestName)}
          />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-medium">{r.guestName}</span>
              <span className="inline-flex [&_*]:whitespace-nowrap [&_svg]:shrink-0">
                <StatusChip tone={r.status.tone}>{r.status.text}</StatusChip>
              </span>
            </span>
            <span className="text-xs text-muted tabular-nums">
              {r.reference} · {r.date}
            </span>
            <span className="text-xs text-pretty text-muted">{r.gifts}</span>
          </div>
        </div>
      ),
    },
    {
      id: 'value',
      header: t('partnerReport.column.value'),
      headerClassName: 'text-end',
      cellClassName: 'text-end align-top whitespace-nowrap tabular-nums',
      render: r => r.value,
    },
    {
      id: 'commission',
      header: t('partnerReport.column.commission'),
      headerClassName: 'text-end',
      cellClassName: 'text-end align-top',
      render: r => (
        <div className="flex flex-col items-end gap-1 [&_*]:whitespace-nowrap [&_svg]:shrink-0">
          <span
            className={`font-semibold tabular-nums ${r.commission.amount ? '' : 'text-muted'}`}
          >
            {r.commission.amount ?? '–'}
          </span>
          <StatusChip tone={r.commission.label.tone}>
            {r.commission.label.text}
          </StatusChip>
        </div>
      ),
    },
  ]

  return (
    <Widget
      actions={<FilterToolbar groups={groups} />}
      className={className}
      description={t('partnerDash.transactions.description')}
      id="partner-transactions"
      title={t('partnerDash.transactions.title')}
    >
      <DataTable
        cards={pageRows => (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
            {pageRows.map(row => (
              <GuestCard key={row.id} row={row} />
            ))}
          </ul>
        )}
        columns={columns}
        empty={{ icon: ReportsIcon, message: t('partnerDash.guests.empty') }}
        getRowId={r => r.id}
        label={t('partnerDash.transactions.title')}
        resetKey={`${resetKey}|${filter.join()}`}
        rows={shown}
        variant="card"
      />
    </Widget>
  )
}

/** The payments log; the same bento box, with its own empty state, when nothing was paid. */
function PaymentsPanel({
  payments,
  className,
}: {
  payments: PartnerOverviewView['payments']
  className: string
}) {
  const { t } = useLocale()

  if (payments)
    return <PaymentsWidget className={className} view={payments} />

  return (
    <Widget
      className={className}
      id="partner-payments-empty"
      title={t('partnerReport.payments.heading')}
    >
      <EmptyState
        icon={ReportsIcon}
        message={t('partnerDash.payments.empty')}
      />
    </Widget>
  )
}

const BARS = [30, 55, 40, 70, 45, 85, 60]

/** The dashboard while loading: the header, four chart cards, the two bento boxes. */
function DashboardSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="flex flex-col gap-5 rounded-3xl bg-surface p-5 shadow-surface lg:col-span-5">
          <Skeleton className="h-5 w-40 rounded-lg" />
          <Skeleton className="h-12 w-56 rounded-lg" />
          <div className="flex items-center gap-4">
            <Skeleton className="size-36 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-3">
              {[0, 1, 2].map(i => (
                <Skeleton key={i} className="h-8 w-full rounded-xl" />
              ))}
            </div>
          </div>
        </div>
        <WidgetSkeleton className="lg:col-span-7">
          <div className="flex h-56 items-end justify-around gap-3 border-b border-separator">
            {BARS.map((h, b) => (
              <Skeleton
                key={b}
                className="w-8 rounded-t-md rounded-b-none"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </WidgetSkeleton>
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-56 rounded-lg" />
            <Skeleton className="h-4 w-72 rounded-lg" />
          </div>
          <Skeleton className="h-10 w-32 rounded-full" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map(i => (
            <WidgetSkeleton key={i}>
              <div className="flex items-center gap-3">
                <Skeleton className="h-7 w-36 rounded-lg" />
                <Skeleton className="h-6 w-14 rounded-full" />
              </div>
              <div className="mt-4 flex h-36 items-end justify-around gap-3 border-b border-separator">
                {BARS.map((h, b) => (
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
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <WidgetSkeleton className="lg:col-span-5">
            <div className="flex flex-col gap-5">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-9 shrink-0 rounded-full" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-4 w-2/3 rounded-lg" />
                    <Skeleton className="h-3 w-1/3 rounded-lg" />
                  </div>
                  <Skeleton className="h-4 w-16 rounded-lg" />
                </div>
              ))}
            </div>
          </WidgetSkeleton>
          <WidgetSkeleton className="lg:col-span-7">
            <div className="flex flex-col gap-4">
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="size-10 shrink-0 rounded-full" />
                  <Skeleton className="h-4 flex-1 rounded-lg" />
                  <Skeleton className="h-4 w-20 rounded-lg" />
                </div>
              ))}
            </div>
          </WidgetSkeleton>
        </div>
      </div>
    </div>
  )
}

export interface PartnerDashboardProps {
  view: PartnerOverviewView
  period: SalesPeriodId
  custom: DayRange | null
  isLoading: boolean
  onPeriodChange: (period: SalesPeriodId) => void
  onCustomChange: (range: DayRange) => void
  /** Opens a month from the months chart (its first day, YYYY-MM-DD). */
  onMonthSelect: (monthStart: string) => void
}

/**
 * P02 Partner report as a dashboard (owner review 15.10.2026, after M02 Overview › Sales): one
 * period dropdown for the whole page; commission, paid out, still to pay and orders as chart
 * cards (commission and orders stack keepsakes red on tours teal); then where the commission
 * stands and how it splits; then a bento of two equal boxes, the payments log beside the
 * transactions table. Read-only; nothing opens an order.
 */
export function PartnerDashboard({
  view,
  period,
  custom,
  isLoading,
  onPeriodChange,
  onCustomChange,
  onMonthSelect,
}: PartnerDashboardProps) {
  const { t } = useLocale()
  const { sales } = view

  if (isLoading)
    return <DashboardSkeleton />

  return (
    <div className="flex flex-col gap-6">
      {view.balance && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <BalanceHero balance={view.balance} className="lg:col-span-5" />
          <MonthsWidget
            className="lg:col-span-7"
            months={view.months}
            title={t('partnerReport.allTime.chart')}
            onSelect={onMonthSelect}
          />
        </div>
      )}
      <section
        aria-labelledby="partner-heading"
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 flex-col">
            <h2 className="text-heading" id="partner-heading">
              {t('partnerDash.heading')}
            </h2>
            <p className="text-sm text-muted">
              {sales.rangeText} · {sales.comparison}
            </p>
          </div>
          <div className="self-end sm:self-auto">
            <PeriodPicker
              custom={custom}
              period={period}
              view={sales}
              onCustom={onCustomChange}
              onPeriod={onPeriodChange}
            />
          </div>
        </div>
        {view.isEmpty
          ? (
              <div className="rounded-3xl bg-surface shadow-surface">
                <EmptyState icon={ReportsIcon} message={t('partnerReport.empty')} />
              </div>
            )
          : (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FigureChart kpi={view.commission} view={sales} />
                  <SingleFigureChart
                    bucketLabel={sales.bucketLabel}
                    figure={view.paid}
                  />
                  <SingleFigureChart
                    bucketLabel={sales.bucketLabel}
                    figure={view.toPay}
                  />
                  <FigureChart kpi={view.orders} view={sales} />
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-stretch">
                  <MixWidget
                    className="h-full lg:col-span-7"
                    groups={view.groups}
                    groupsHeading={t('partnerReport.groupsHeading')}
                    mix={view.mix}
                  />
                  <PaymentsPanel
                    className="h-full lg:col-span-5"
                    payments={view.payments}
                  />
                </div>
                <TransactionsWidget
                  className=""
                  resetKey={`${period}|${sales.rangeText}`}
                  rows={view.rows}
                />
              </>
            )}
        {view.demoNote && <p className="text-xs text-muted">{view.demoNote}</p>}
      </section>
    </div>
  )
}
