import type { DayRange, SalesPeriodId } from '@sk/domain/reporting'
import type {
  SalesBar,
  SalesKpi,
  SalesOverviewView,
} from '../hooks/use-sales-overview'
import type { DataTableColumn } from '@/components/data-table'

import {
  Button,
  DateField,
  DateRangePicker,
  Dropdown,
  Label,
  Radio,
  RadioGroup,
  RangeCalendar,
  Skeleton,
} from '@heroui/react'
import { parseDate } from '@internationalized/date'
import { numberFormat } from '@sk/domain/shared'
import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { DataTable } from '@/components/data-table'

import { EmptyState } from '@/components/empty-state'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ReportsIcon,
} from '@/components/icons'
import { SheetFrame } from '@/components/sheet-frame'
import { DeltaChip } from '@/components/stat-card'
import { useLocale } from '@/contexts/locale-context'
import {
  TooltipCard,
  Widget,
} from '@/features/merchant/today/components/overview-analytics'
import { WidgetSkeleton } from '@/features/merchant/today/components/overview-pages'
import { useIsWide } from '@/hooks/use-is-wide'
import { useSimulatedLoading } from '@/hooks/use-simulated-loading'
import { useSalesOverview } from '../hooks/use-sales-overview'
import { SalesAllTime } from './sales-all-time'

export const noAnimation = { isAnimationActive: false } as const
/** Gifts red, tours teal (owner 15.10.2026), in every chart of the page. */
export const MIX_COLOURS = ['var(--chart-1)', 'var(--chart-4)']
const MIX_TRACKS = ['var(--chart-track)', 'var(--chart-4-track)']
const tick = { fill: 'var(--muted)', fontSize: 11 }

const choiceCard
  = 'rounded-2xl border border-separator p-3 data-[selected=true]:border-foreground data-[selected=true]:ring-1 data-[selected=true]:ring-foreground'

/**
 * Phones: the periods in a bottom sheet. A preset applies and closes at once; "Custom range"
 * opens a calendar in the sheet itself, since a popover calendar does not fit a phone.
 */
function PeriodSheet({
  view,
  period,
  range,
  onPeriod,
  onCustom,
  onClose,
}: {
  view: SalesOverviewView
  period: SalesPeriodId
  range: DayRange
  onPeriod: (p: SalesPeriodId) => void
  onCustom: (r: DayRange) => void
  onClose: () => void
}) {
  const { t } = useLocale()
  const calendarRef = useRef<HTMLDivElement>(null)

  // The calendar opens below the last period; bring it into view.
  useEffect(() => {
    if (period === 'custom') {
      calendarRef.current?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      })
    }
  }, [period])

  return (
    <SheetFrame
      isOpen
      footer={(
        <Button fullWidth onPress={onClose}>
          {t('reports.filter.apply')}
        </Button>
      )}
      title={t('salesOverview.period')}
      onClose={onClose}
    >
      <RadioGroup
        aria-label={t('salesOverview.period')}
        className="gap-2"
        value={period}
        onChange={(value) => {
          onPeriod(value as SalesPeriodId)
          if (value !== 'custom')
            onClose()
        }}
      >
        {view.periods.map(p => (
          <Radio key={p.id} className={choiceCard} value={p.id}>
            <Radio.Content>
              <Radio.Control>
                <Radio.Indicator />
              </Radio.Control>
              {p.label}
            </Radio.Content>
          </Radio>
        ))}
      </RadioGroup>
      {period === 'custom' && (
        <div ref={calendarRef}>
          <RangeCalendar
            aria-label={t('salesOverview.dates')}
            className="w-full"
            maxValue={parseDate(view.today)}
            minValue={parseDate(view.firstDay)}
            value={{ start: parseDate(range.start), end: parseDate(range.end) }}
            onChange={v =>
              onCustom({ start: v.start.toString(), end: v.end.toString() })}
          >
            <RangeCalendar.Header>
              <RangeCalendar.Heading />
              <RangeCalendar.NavButton slot="previous" />
              <RangeCalendar.NavButton slot="next" />
            </RangeCalendar.Header>
            <RangeCalendar.Grid>
              <RangeCalendar.GridHeader>
                {day => (
                  <RangeCalendar.HeaderCell>{day}</RangeCalendar.HeaderCell>
                )}
              </RangeCalendar.GridHeader>
              <RangeCalendar.GridBody>
                {date => <RangeCalendar.Cell date={date} />}
              </RangeCalendar.GridBody>
            </RangeCalendar.Grid>
          </RangeCalendar>
        </div>
      )}
    </SheetFrame>
  )
}

/**
 * The period dropdown; "Custom range" adds a date range field next to it. On phones the
 * button opens a bottom sheet instead (`PeriodSheet`).
 */
export function PeriodPicker({
  view,
  period,
  custom,
  onPeriod,
  onCustom,
}: {
  view: SalesOverviewView
  period: SalesPeriodId
  custom: DayRange | null
  onPeriod: (p: SalesPeriodId) => void
  onCustom: (r: DayRange) => void
}) {
  const { t } = useLocale()
  const label = view.periods.find(p => p.id === period)?.label ?? ''
  const range = custom ?? view.current
  const isWide = useIsWide()
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  if (!isWide) {
    return (
      <div className="flex shrink-0 justify-end">
        <Button
          aria-label={`${t('salesOverview.period')}: ${label}`}
          variant="tertiary"
          onPress={() => setIsSheetOpen(true)}
        >
          {label}
          <ChevronDownIcon aria-hidden size={16} />
        </Button>
        {isSheetOpen && (
          <PeriodSheet
            period={period}
            range={range}
            view={view}
            onClose={() => setIsSheetOpen(false)}
            onCustom={onCustom}
            onPeriod={onPeriod}
          />
        )}
      </div>
    )
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
      <Dropdown>
        <Button
          aria-label={`${t('salesOverview.period')}: ${label}`}
          variant="tertiary"
        >
          {label}
          <ChevronDownIcon aria-hidden size={16} />
        </Button>
        <Dropdown.Popover placement="bottom end">
          <Dropdown.Menu
            aria-label={t('salesOverview.period')}
            selectedKeys={new Set([period])}
            selectionMode="single"
            onSelectionChange={(keys) => {
              const [next] = [...keys]

              if (next)
                onPeriod(next as SalesPeriodId)
            }}
          >
            {view.periods.map(p => (
              <Dropdown.Item key={p.id} id={p.id} textValue={p.label}>
                <Label>{p.label}</Label>
                <Dropdown.ItemIndicator />
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
      {period === 'custom' && (
        <DateRangePicker
          aria-label={t('salesOverview.dates')}
          maxValue={parseDate(view.today)}
          minValue={parseDate(view.firstDay)}
          value={{ start: parseDate(range.start), end: parseDate(range.end) }}
          onChange={v =>
            v && onCustom({ start: v.start.toString(), end: v.end.toString() })}
        >
          <DateField.Group>
            <DateField.Input slot="start">
              {segment => <DateField.Segment segment={segment} />}
            </DateField.Input>
            <DateRangePicker.RangeSeparator />
            <DateField.Input slot="end">
              {segment => <DateField.Segment segment={segment} />}
            </DateField.Input>
            <DateField.Suffix>
              <DateRangePicker.Trigger aria-label={t('salesOverview.dates')}>
                <DateRangePicker.TriggerIndicator />
              </DateRangePicker.Trigger>
            </DateField.Suffix>
          </DateField.Group>
          <DateRangePicker.Popover>
            <RangeCalendar aria-label={t('salesOverview.dates')}>
              <RangeCalendar.Header>
                <RangeCalendar.Heading />
                <RangeCalendar.NavButton slot="previous" />
                <RangeCalendar.NavButton slot="next" />
              </RangeCalendar.Header>
              <RangeCalendar.Grid>
                <RangeCalendar.GridHeader>
                  {day => (
                    <RangeCalendar.HeaderCell>{day}</RangeCalendar.HeaderCell>
                  )}
                </RangeCalendar.GridHeader>
                <RangeCalendar.GridBody>
                  {date => <RangeCalendar.Cell date={date} />}
                </RangeCalendar.GridBody>
              </RangeCalendar.Grid>
            </RangeCalendar>
          </DateRangePicker.Popover>
        </DateRangePicker>
      )}
    </div>
  )
}

/**
 * One figure as a chart card: its total and change, a short note, the figure per hour,
 * day, week or month, and what it counts. Four of these replace the cards and the chart.
 */
export function FigureChart({
  kpi,
  view,
}: {
  kpi: SalesKpi
  view: SalesOverviewView
}) {
  const { t, intlLocale } = useLocale()
  const compact = numberFormat(intlLocale, {
    notation: 'compact',
    maximumFractionDigits: 1,
  })
  const tooltip = ({
    active,
    payload,
  }: {
    active?: boolean
    payload?: readonly { payload?: SalesBar }[]
  }) => {
    const bar = payload?.[0]?.payload

    if (!active || !bar)
      return null

    return (
      <TooltipCard
        heading={
          bar.partial
            ? `${bar.heading} · ${t('salesOverview.partial')}`
            : bar.heading
        }
        rows={[
          {
            key: 'gifts',
            colour: MIX_COLOURS[0],
            label: t('salesOverview.gifts'),
            value: bar.giftsText,
          },
          {
            key: 'now',
            colour: 'var(--foreground)',
            label: t('salesOverview.total'),
            value: bar.valueText,
          },
          ...(bar.previousText
            ? [
                {
                  key: 'before',
                  colour: 'var(--chart-3)',
                  label: t('salesOverview.previous'),
                  value: bar.previousText,
                },
              ]
            : []),
        ]}
      />
    )
  }

  return (
    <Widget
      className="h-full"
      description={kpi.note ?? kpi.split}
      footer={kpi.hint}
      id={`sales-chart-${kpi.id}`}
      title={kpi.label}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-2xl font-semibold tracking-tight tabular-nums">
          {kpi.value}
        </span>
        {kpi.delta && <DeltaChip {...kpi.delta} />}
        <span className="ms-auto text-xs text-muted">{view.bucketLabel}</span>
      </div>
      <ul className="mt-2 flex gap-4 text-xs text-muted">
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-2.5 rounded-sm"
            style={{ background: MIX_COLOURS[0] }}
          />
          {t('salesOverview.gifts')}
        </li>
      </ul>
      <div className="mt-3 h-40 min-w-0">
        <ResponsiveContainer height="100%" width="100%">
          <BarChart
            data={kpi.bars}
            margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
            title={`${kpi.label} ${view.bucketLabel}`}
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
              allowDecimals={kpi.isMoney}
              axisLine={false}
              tick={tick}
              tickCount={4}
              tickFormatter={(v: number) =>
                compact.format(kpi.isMoney ? v / 100 : v)}
              tickLine={false}
              width={40}
            />
            <Tooltip content={tooltip} cursor={false} />
            <Bar
              {...noAnimation}
              dataKey="gifts"
              maxBarSize={24}
              radius={[6, 6, 6, 6]}
              stackId="mix"
            >
              {kpi.bars.map(b => (
                <Cell
                  key={b.key}
                  fill={MIX_COLOURS[0]}
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

/**
 * Total sales split into gifts and tours, full width: a donut of the split with the total
 * in its middle, then each side's figures (total sales, orders, collected, unpaid).
 */
function MixCard({
  mix,
  total,
}: {
  mix: SalesOverviewView['mix']
  total: string
}) {
  const { t } = useLocale()
  const colour = MIX_COLOURS

  return (
    <Widget
      description={t('salesOverview.mix.description')}
      id="sales-mix"
      title={t('salesOverview.mix.title')}
    >
      <div className="grid grid-cols-1 items-center gap-5 md:grid-cols-[13rem_1fr_1fr]">
        <div className="relative mx-auto size-52">
          <ResponsiveContainer height="100%" width="100%">
            <PieChart accessibilityLayer={false}>
              <Pie
                {...noAnimation}
                cornerRadius={6}
                data={mix.map(m => ({ name: m.label, value: m.share }))}
                dataKey="value"
                endAngle={-270}
                innerRadius="72%"
                outerRadius="100%"
                paddingAngle={2}
                startAngle={90}
                stroke="none"
              >
                {mix.map((m, i) => (
                  <Cell key={m.id} fill={colour[i]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-xs text-muted">
              {t('salesOverview.value')}
            </span>
            <span className="text-lg font-semibold tabular-nums">{total}</span>
          </div>
        </div>
        {mix.map((m, i) => {
          const fact = (id: string) =>
            m.facts.find(f => f.id === id)?.value ?? ''

          return (
            <section
              key={m.id}
              aria-labelledby={`sales-mix-${m.id}`}
              className="flex h-full flex-col gap-4 rounded-2xl border border-separator p-4"
            >
              <h4
                className="flex items-center gap-2 font-semibold"
                id={`sales-mix-${m.id}`}
              >
                <span
                  aria-hidden
                  className="size-2.5 rounded-full"
                  style={{ background: colour[i] }}
                />
                {m.label}
              </h4>
              <div className="flex flex-col">
                <span className="text-2xl font-semibold tracking-tight tabular-nums">
                  {m.value}
                </span>
                <span className="text-sm text-muted">
                  {m.orders}
                </span>
              </div>
              <div className="mt-auto flex flex-col gap-2">
                <span
                  aria-hidden
                  className="flex h-2 overflow-hidden rounded-full"
                  style={{ background: MIX_TRACKS[i] }}
                >
                  <span
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.round(m.paidShare * 100)}%`,
                      background: colour[i],
                    }}
                  />
                </span>
                <dl className="flex justify-between gap-3 text-sm">
                  <div className="flex flex-col">
                    <dt className="text-xs text-muted">
                      {t('salesOverview.collected')}
                    </dt>
                    <dd className="font-semibold tabular-nums">
                      {fact('collected')}
                    </dd>
                  </div>
                  <div className="flex flex-col items-end text-end">
                    <dt className="text-xs text-muted">
                      {t('salesOverview.unpaidShort')}
                    </dt>
                    <dd className="font-semibold tabular-nums">
                      {fact('unpaid')}
                    </dd>
                  </div>
                </dl>
              </div>
            </section>
          )
        })}
      </div>
    </Widget>
  )
}

/**
 * The best sellers: the top 5 with a link to Reports, or (`isFull`, in Reports) every gift and
 * tour sold, 10 to a page.
 */
export function TopSellers({
  rows,
  isFull = false,
}: {
  rows: SalesOverviewView['top']
  isFull?: boolean
}) {
  const { t } = useLocale()

  return (
    <Widget
      actions={
        isFull
          ? undefined
          : (
              <Link
                className="inline-flex h-8 shrink-0 items-center gap-0.5 rounded-md text-xs font-medium text-muted outline-none hover:text-foreground focus-visible:focus-ring active:opacity-60"
                to="/store/reports/sales"
              >
                {t('salesOverview.top.seeAll')}
                <ChevronRightIcon aria-hidden size={14} />
              </Link>
            )
      }
      className="h-full"
      description={t('salesOverview.top.description')}
      id="sales-top-sellers"
      title={t(
        isFull ? 'salesOverview.sellers.title' : 'salesOverview.top.title',
      )}
    >
      <SellersTable rows={rows} />
    </Widget>
  )
}

function SellersTable({ rows }: { rows: SalesOverviewView['top'] }) {
  const { t } = useLocale()
  const typeLabel = (type: 'gift' | 'tour') =>
    t(type === 'gift' ? 'salesOverview.top.gift' : 'salesOverview.top.tour')
  const columns: DataTableColumn<SalesOverviewView['top'][number]>[] = [
    {
      id: 'rank',
      header: <span className="sr-only">#</span>,
      headerClassName: 'w-6',
      cellClassName: 'text-muted tabular-nums',
      render: r => rows.indexOf(r) + 1,
    },
    {
      id: 'product',
      header: t('salesOverview.top.product'),
      isRowHeader: true,
      render: r => (
        <>
          <span className="block font-medium">{r.name}</span>
          <span className="text-xs text-muted sm:hidden">
            {typeLabel(r.type)} · {r.sold}
          </span>
        </>
      ),
    },
    {
      id: 'type',
      header: t('salesOverview.top.type'),
      headerClassName: 'hidden sm:table-cell',
      cellClassName: 'hidden text-muted sm:table-cell',
      render: r => typeLabel(r.type),
    },
    {
      id: 'sold',
      header: t('salesOverview.top.sold'),
      headerClassName: 'hidden text-end sm:table-cell',
      cellClassName:
        'hidden text-end whitespace-nowrap text-muted tabular-nums sm:table-cell',
      render: r => r.sold,
    },
    {
      id: 'value',
      header: t('salesOverview.value'),
      headerClassName: 'text-end',
      cellClassName: 'text-end font-medium whitespace-nowrap tabular-nums',
      render: r => r.value,
    },
    {
      id: 'share',
      header: t('salesOverview.top.share'),
      headerClassName: 'hidden text-end sm:table-cell',
      cellClassName: 'hidden text-end text-muted tabular-nums sm:table-cell',
      render: r => r.share,
    },
  ]

  return (
    <DataTable
      columns={columns}
      empty={{ icon: ReportsIcon, message: t('salesOverview.top.empty') }}
      getRowId={r => r.id}
      label={t('salesOverview.top.title')}
      rows={rows}
      variant="card"
    />
  )
}

/** Bars of the demo-week shape while loading. */
const SKELETON_BARS = [30, 55, 40, 70, 45, 85, 60]

/** Sales while loading: the header, four chart cards, top sellers and the split. */
function SalesSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="flex flex-col gap-5 rounded-3xl bg-surface p-5 shadow-surface lg:col-span-5">
          <Skeleton className="h-5 w-40 rounded-lg" />
          <Skeleton className="h-12 w-56 rounded-lg" />
          <Skeleton className="mx-auto size-44 rounded-full" />
        </div>
        <WidgetSkeleton className="lg:col-span-7">
          <div className="flex h-56 items-end justify-around gap-3 border-b border-separator">
            {SKELETON_BARS.map((h, b) => (
              <Skeleton
                key={b}
                className="w-8 rounded-t-md rounded-b-none"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </WidgetSkeleton>
      </div>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-48 rounded-lg" />
          <Skeleton className="h-4 w-64 rounded-lg" />
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
              {SKELETON_BARS.map((h, b) => (
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
      <div className="flex flex-col gap-4">
        <WidgetSkeleton>
          {[0, 1].map(i => (
            <div key={i} className="flex flex-col gap-2 py-2">
              <Skeleton className="h-4 w-16 rounded-lg" />
              <Skeleton className="h-7 w-36 rounded-lg" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </WidgetSkeleton>
        <WidgetSkeleton>
          <div className="flex flex-col gap-4">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 flex-1 rounded-lg" />
                <Skeleton className="h-4 w-20 rounded-lg" />
              </div>
            ))}
          </div>
        </WidgetSkeleton>
      </div>
    </div>
  )
}

/**
 * M02 Overview › Sales (owner review 15.10.2026): one period (dropdown, default the last 7
 * days), a chart per figure with gifts and tours stacked, the gifts and tours split, and the
 * top sellers.
 */
export function SalesOverview() {
  const { t } = useLocale()
  const isLoading = useSimulatedLoading()
  const [period, setPeriod] = useState<SalesPeriodId>('7d')
  const [custom, setCustom] = useState<DayRange | null>(null)
  const view = useSalesOverview(period, period === 'custom' ? custom : null)

  if (isLoading)
    return <SalesSkeleton />

  return (
    <section aria-labelledby="sales-heading" className="flex flex-col gap-4">
      <SalesAllTime
        view={view}
        onMonthSelect={(start) => {
          // A month opens as its days, up to today for the running month.
          const last = new Date(`${start.slice(0, 8)}01T12:00:00Z`)

          last.setUTCMonth(last.getUTCMonth() + 1, 0)
          const end = last.toISOString().slice(0, 10)

          setCustom({ start, end: end < view.today ? end : view.today })
          setPeriod('custom')
        }}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col">
          <h2 className="text-heading" id="sales-heading">
            {t('salesOverview.heading')}
          </h2>
          <p className="text-sm text-muted">
            {view.rangeText} · {view.comparison}
          </p>
        </div>
        <div className="self-end sm:self-auto">
          <PeriodPicker
            custom={custom}
            period={period}
            view={view}
            onCustom={setCustom}
            onPeriod={(p) => {
              if (p === 'custom' && !custom)
                setCustom(view.current)
              setPeriod(p)
            }}
          />
        </div>
      </div>
      {view.isEmpty
        ? (
            <div className="rounded-3xl bg-surface shadow-surface">
              <EmptyState icon={ReportsIcon} message={t('overview.empty')} />
            </div>
          )
        : (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {view.kpis.map(k => (
                  <FigureChart key={k.id} kpi={k} view={view} />
                ))}
              </div>
              <MixCard mix={view.mix} total={view.kpis[0].value} />
              <TopSellers rows={view.top} />
            </>
          )}
    </section>
  )
}
