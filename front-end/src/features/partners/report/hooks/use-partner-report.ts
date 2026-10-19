import type {
  ReportChartView,
  ReportGroupView,
  ReportKpi,
  ReportRowView,
} from '../components/partner-report'
import type { PaymentsView } from '../components/payments-widget'
import type {
  DateRange,
  ReportBucket,
  ReportPeriod,
  ReportRow,
} from '../lib/report'
import type { AllTimeCardProps } from '@/components/stat-card'
import type { MessageKey } from '@/i18n/en'
import type { IntlLocale } from '@/lib/format'

import { useMemo } from 'react'

import { ClockIcon, PartnersIcon, PayLaterIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'

import { zurichDate } from '@/features/catalog/lib/pickup'
import { useDemo, useDemoNow } from '@/features/demo'
import { DEMO_HISTORY } from '@/features/merchant/today/lib/demo-history'
import { formatOrderDate } from '@/features/orders/lib/format'
import { formatLabel } from '@/features/orders/lib/labels'
import { deltaOf } from '@/lib/analytics'
import {
  calendarDay,
  dateTimeFormat,
  formatMoney,
  formatShortDate,
  numberFormat,
  percentOf,
} from '@/lib/format'
import { pickText } from '@/lib/localized'
import { periodMoney } from '../lib/payouts'
import {
  partnerAllTime,
  partnerReport,
  periodRange,
  REPORT_PERIODS,
  shiftPeriod,
} from '../lib/report'

const TRAILING_DOT = /\.$/

const periodLabels: Record<ReportPeriod, MessageKey> = {
  day: 'partnerReport.period.day',
  week: 'partnerReport.period.week',
  month: 'partnerReport.period.month',
}

const chartTitles: Record<ReportPeriod, MessageKey> = {
  day: 'partnerReport.chart.title.day',
  week: 'partnerReport.chart.title.week',
  month: 'partnerReport.chart.title.month',
}

/** Smallest round step (in Rappen) that covers `max` in at most four gridlines. */
function chartScale(max: number): { top: number, step: number } {
  for (const francs of [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000]) {
    const step = francs * 100

    if (max <= step * 4)
      return { top: Math.max(1, Math.ceil(max / step)) * step, step }
  }
  const step = Math.ceil(max / 400) * 100

  return { top: step * 4, step }
}

const hourLabel = (hour: number) => `${String(hour).padStart(2, '0')}:00`

/** "12–18 Oct" for a week inside one month. */
function dayRange(b: ReportBucket, locale: IntlLocale): string {
  const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) =>
    dateTimeFormat(locale, { ...opts, timeZone: 'UTC' }).format(
      calendarDay(iso),
    )
  const month = fmt(b.end, { day: 'numeric', month: 'short' })

  return b.start === b.end
    ? month
    : `${fmt(b.start, { day: 'numeric' }).replace(TRAILING_DOT, '')}–${month}`
}

/**
 * P02 Partner report for the partner who opened their report link (P01, step 5.6).
 * `anchor` is any Zurich day inside the period; absent = today.
 */
export function usePartnerReport(
  partnerId: string,
  period: ReportPeriod,
  anchor?: string,
  /** Any range of days instead of the period around `anchor`. */
  range?: DateRange,
) {
  const { t, language, intlLocale } = useLocale()
  const { state } = useDemo()
  const now = useDemoNow()
  const today = zurichDate(now)
  const day = anchor ?? today
  const partner
    = state.data.partners.find(p => p.id === partnerId)
      ?? state.data.partners[0]
  const { orders, guests, products, subcategories, tours } = state.data
  const tourBookings = state.data.tours?.bookings
  // The 1.9s demo history counts here too (owner review 1.9t), so the all-time card and the
  // period report agree; only while the demo has orders, as on M02.
  const withHistory = useMemo(
    () => (orders.length ? [...DEMO_HISTORY, ...orders] : []),
    [orders],
  )
  const nowMs = now.getTime()
  const rangeStart = range?.start
  const rangeEnd = range?.end
  const report = useMemo(
    () =>
      partnerReport(
        { orders: withHistory, guests, products, subcategories, tours },
        partner.id,
        period,
        day,
        new Date(nowMs),
        rangeStart && rangeEnd
          ? { start: rangeStart, end: rangeEnd }
          : undefined,
      ),
    [
      withHistory,
      guests,
      products,
      subcategories,
      tours,
      partner.id,
      period,
      day,
      nowMs,
      rangeStart,
      rangeEnd,
    ],
  )
  const allTimeData = useMemo(
    () => partnerAllTime(withHistory, partner.id, today, tourBookings),
    [withHistory, partner.id, today, tourBookings],
  )
  const { commissionAdjustments, partnerPayouts } = state.data
  // Payouts, refunds and offsets from the M15/M16 ledger (step 5.7), so P02 matches M16.
  const moneyIn = useMemo(
    () =>
      periodMoney(
        { orders, tours, commissionAdjustments, partnerPayouts },
        partner.id,
        report.range,
        new Date(nowMs),
      ),
    [
      orders,
      tours,
      commissionAdjustments,
      partnerPayouts,
      partner.id,
      report.range,
      nowMs,
    ],
  )
  // The period before, for the dashboard's comparisons (deltas, previous-period markers).
  const previousDay = shiftPeriod(period, day, -1)
  const previousReport = useMemo(
    () =>
      partnerReport(
        { orders: withHistory, guests, products, subcategories, tours },
        partner.id,
        period,
        previousDay,
        new Date(nowMs),
      ),
    [
      withHistory,
      guests,
      products,
      subcategories,
      tours,
      partner.id,
      period,
      previousDay,
      nowMs,
    ],
  )
  const previousMoney = useMemo(
    () =>
      periodMoney(
        { orders, tours, commissionAdjustments, partnerPayouts },
        partner.id,
        previousReport.range,
        new Date(nowMs),
      ),
    [
      orders,
      tours,
      commissionAdjustments,
      partnerPayouts,
      partner.id,
      previousReport.range,
      nowMs,
    ],
  )
  const money = (rappen: number) => formatMoney(rappen / 100, intlLocale)
  const plural = new Intl.PluralRules(intlLocale)
  const share = (part: number, whole: number) =>
    percentOf(part, whole, intlLocale)
  const { start, end } = report.range

  const rangeLabel
    = period === 'day'
      ? formatShortDate(start, today, intlLocale)
      : period === 'week'
        ? `${formatShortDate(start, today, intlLocale)} – ${formatShortDate(end, today, intlLocale)}`
        : dateTimeFormat(intlLocale, {
            month: 'long',
            year: 'numeric',
            timeZone: 'UTC',
          }).format(calendarDay(start))

  const ordersText = (count: number) =>
    t(
      plural.select(count) === 'one'
        ? 'partnerReport.chart.orders.one'
        : 'partnerReport.chart.orders.other',
      { count },
    )

  const gifts = ({ lines }: ReportRow) => {
    const [first, ...rest] = lines
    const product = first ? pickText(first.productName, language).text : ''
    const vars = {
      product,
      quantity: first?.quantity ?? 0,
      count: rest.length,
    }

    return t(
      rest.length ? 'partnerReport.giftsMore' : 'partnerReport.gifts',
      vars,
    )
  }

  const rows: ReportRowView[] = report.rows.map(row => ({
    id: row.id,
    reference: row.ref,
    date: formatOrderDate(zurichDate(new Date(row.createdAt)), intlLocale),
    guestName: row.guestName,
    gifts: gifts(row),
    value: money(row.value),
    status: {
      text: formatLabel(row.status, t, intlLocale),
      tone: row.status.tone,
    },
    commission: {
      amount:
        row.commission.state === 'not-applicable'
          ? null
          : money(row.commission.amount),
      label: {
        text: formatLabel(row.commission.label, t, intlLocale),
        tone: row.commission.label.tone,
      },
    },
  }))

  // Largest first; the bar shows recorded plus estimated against the largest group.
  const groupMax = Math.max(
    1,
    ...report.groups.map(g => g.recorded + g.estimated),
  )
  const groups: ReportGroupView[] = [...report.groups]
    .sort((a, b) => b.recorded + b.estimated - (a.recorded + a.estimated))
    .map((g) => {
      const category = subcategories.find(c => c.id === g.subcategoryId)

      return {
        id: g.subcategoryId,
        name: category
          ? pickText(category.name, language).text
          : t('tourMerchant.reportGroup'),
        summary: t(
          plural.select(g.orders) === 'one'
            ? 'partnerReport.group.summary.one'
            : 'partnerReport.group.summary.other',
          { count: g.orders, value: money(g.value) },
        ),
        commission: money(g.recorded),
        estimated: g.estimated
          ? t('partnerReport.group.estimated', { amount: money(g.estimated) })
          : null,
        recordedShare: g.recorded / groupMax,
        estimatedShare: g.estimated / groupMax,
      }
    })

  const { top, step } = chartScale(
    Math.max(...report.buckets.map(b => b.recorded + b.estimated)),
  )
  const francs = numberFormat(intlLocale, {
    maximumFractionDigits: 0,
  })
  // Caps and gridlines drop "CHF": the chart subtitle names the unit once.
  const amount = numberFormat(intlLocale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  const columnLabel = (b: ReportBucket) =>
    b.hour !== undefined
      ? `${hourLabel(b.hour)}–${hourLabel((b.hour + 1) % 24)}`
      : period === 'week'
        ? formatShortDate(b.start, today, intlLocale)
        : dayRange(b, intlLocale)
  const axisLabel = (b: ReportBucket) => {
    if (b.hour !== undefined)
      return b.hour % 6 === 0 ? hourLabel(b.hour) : null
    // Days only; the month is in the period label above.
    if (period === 'month')
      return `${Number(b.start.slice(8))}–${Number(b.end.slice(8))}`
    if (b.start === today)
      return t('partnerReport.chart.today')

    return dateTimeFormat(intlLocale, {
      weekday: 'short',
      timeZone: 'UTC',
    }).format(calendarDay(b.start))
  }
  const columns = report.buckets.map((b) => {
    const label = columnLabel(b)
    const recorded = money(b.recorded)
    const estimated = money(b.estimated)
    const orders = ordersText(b.orders)

    return {
      id: `${b.start}-${b.hour ?? ''}`,
      axisLabel: axisLabel(b),
      label,
      ariaLabel: t('partnerReport.chart.column', {
        label,
        recorded,
        estimated,
        orders,
      }),
      readout: t('partnerReport.chart.readout', { recorded, estimated }),
      orders,
      // Value on the cap only when the columns are wide enough to hold it.
      cap:
        b.recorded + b.estimated && report.buckets.length <= 7
          ? amount.format((b.recorded + b.estimated) / 100)
          : null,
      recordedShare: b.recorded / top,
      estimatedShare: b.estimated / top,
      isFuture: b.isFuture,
      isCurrent: b.isCurrent,
    }
  })
  // The readout opens on the latest column with orders, else the running one.
  const latest = report.buckets.reduce(
    (found, b, i) => (!b.isFuture && b.orders ? i : found),
    -1,
  )
  const chartTitle = t(chartTitles[period])
  const chart: ReportChartView = {
    title: chartTitle,
    label: t('partnerReport.chart.label', {
      title: chartTitle,
      range: rangeLabel,
    }),
    unit: t('partnerReport.chart.unit'),
    legend: {
      recorded: t('partnerReport.chart.recorded'),
      estimated: t('partnerReport.chart.estimated'),
    },
    ticks: Array.from({ length: top / step + 1 }, (_, i) => ({
      share: (i * step) / top,
      label: francs.format((i * step) / 100),
    })),
    columns,
    initialIndex:
      latest >= 0
        ? latest
        : Math.max(
            0,
            report.buckets.findIndex(b => b.isCurrent),
          ),
  }

  const { recorded, estimated: open } = report.counts
  const closed = report.counts['not-applicable']
  const kpis: ReportKpi[] = [
    {
      id: 'earned',
      label: t('partnerReport.number.earned'),
      // Never negative (D16): a refund larger than the period's commission shows as its
      // own line in the hint and in "Payments and adjustments".
      value: money(Math.max(0, report.earned - moneyIn.adjusted)),
      hint: moneyIn.adjusted
        ? t('partnerReport.number.earned.hintRefund', {
            recorded: money(report.earned),
            refund: money(moneyIn.adjusted),
          })
        : report.estimated
          ? t('partnerReport.number.earned.hintEstimated', {
              amount: money(report.estimated),
            })
          : t('partnerReport.number.earned.hint'),
    },
    {
      id: 'paid',
      label: t('partnerReport.number.paid'),
      value: money(moneyIn.paid),
      hint: moneyIn.payouts
        ? t(
            moneyIn.payouts === 1
              ? 'partnerReport.number.paid.hintOne'
              : 'partnerReport.number.paid.hintOther',
            { count: moneyIn.payouts },
          )
        : t('partnerReport.number.paid.hintNone'),
    },
    {
      id: 'to-pay',
      label: t('partnerReport.number.toPay'),
      value: money(moneyIn.toPay),
      hint: moneyIn.toOffset
        ? t('partnerReport.number.toPay.hintOffset', {
            amount: money(moneyIn.toOffset),
          })
        : t('partnerReport.number.toPay.hintAfter'),
    },
    {
      id: 'orders',
      label: t('partnerReport.number.orders'),
      value: String(report.rows.length),
      hint: t(
        closed
          ? 'partnerReport.number.orders.hintClosed'
          : 'partnerReport.number.orders.hint',
        { completed: recorded, open, closed },
      ),
    },
  ]

  const monthName = (iso: string, opts: Intl.DateTimeFormatOptions) =>
    dateTimeFormat(intlLocale, { ...opts, timeZone: 'UTC' }).format(
      calendarDay(iso),
    )
  const allTime: AllTimeCardProps | null = allTimeData && {
    id: 'report-alltime',
    title: t('partnerReport.allTime.title'),
    description: t('partnerReport.allTime.description', {
      date: monthName(allTimeData.firstDay, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    }),
    value: money(allTimeData.earned),
    delta: (() => {
      const d = deltaOf(
        allTimeData.last30,
        allTimeData.previous30,
        'up',
        intlLocale,
      )
      const { start: from, end: to } = allTimeData.previousRange
      const span = `${formatShortDate(from, today, intlLocale)} – ${formatShortDate(to, today, intlLocale)}`

      return {
        text: d.delta,
        tone: d.tone,
        direction: d.direction,
        label: d.delta
          ? t('partnerReport.allTime.delta', { delta: d.delta, range: span })
          : t('partnerReport.allTime.deltaNone', { range: span }),
      }
    })(),
    sentence: t('partnerReport.allTime.sentence', {
      last: money(allTimeData.last30),
      previous: money(allTimeData.previous30),
    }),
    chart: {
      title: t('partnerReport.allTime.chart'),
      bars: allTimeData.months.map((m, i) => {
        const isCurrent = i === allTimeData.months.length - 1

        return {
          id: m.start,
          tick: monthName(m.start, { month: 'short' }),
          label: isCurrent
            ? t('partnerReport.allTime.thisMonth')
            : monthName(m.start, { month: 'long', year: 'numeric' }),
          value: m.earned === null ? null : m.earned / 100,
          valueText:
            m.earned === null
              ? t('partnerReport.allTime.noData')
              : money(m.earned),
          isCurrent,
        }
      }),
      tableLabels: {
        item: t('partnerReport.allTime.monthColumn'),
        value: t('partnerReport.allTime.earned'),
      },
    },
    metricsLabel: t('partnerReport.allTime.metrics'),
    metrics: [
      {
        id: 'earned',
        icon: PartnersIcon,
        label: t('partnerReport.allTime.earned'),
        value: money(allTimeData.earned),
        caption: t('partnerReport.allTime.earned.caption', {
          share: share(
            allTimeData.earned,
            allTimeData.earned + allTimeData.estimated,
          ),
          total: money(allTimeData.earned + allTimeData.estimated),
        }),
        share:
          allTimeData.earned
          / Math.max(1, allTimeData.earned + allTimeData.estimated),
      },
      {
        id: 'paid',
        icon: PayLaterIcon,
        label: t('partnerReport.allTime.paid'),
        value: money(moneyIn.allTime.paid),
        caption: t('partnerReport.allTime.ofEarned', {
          share: share(moneyIn.allTime.paid, allTimeData.earned),
        }),
        share: Math.min(
          1,
          moneyIn.allTime.paid / Math.max(1, allTimeData.earned),
        ),
      },
      {
        id: 'to-pay',
        icon: ClockIcon,
        label: t('partnerReport.number.toPay'),
        value: money(moneyIn.allTime.toPay),
        caption: moneyIn.allTime.toOffset
          ? t('partnerReport.number.toPay.hintOffset', {
              amount: money(moneyIn.allTime.toOffset),
            })
          : t('partnerReport.allTime.ofEarned', {
              share: share(moneyIn.allTime.toPay, allTimeData.earned),
            }),
        share: moneyIn.allTime.toPay / Math.max(1, allTimeData.earned),
      },
    ],
  }

  const refOf = (id: string) =>
    withHistory.find(o => o.id === id)?.ref
    ?? tourBookings?.find(b => b.id === id)?.ref
    ?? ''
  const entryDate = (at: string) =>
    formatOrderDate(zurichDate(new Date(at)), intlLocale)
  const payments: PaymentsView | null
    = moneyIn.entries.length || moneyIn.carriedIn
      ? {
          heading: t('partnerReport.payments.heading'),
          carriedIn: moneyIn.carriedIn
            ? t('partnerReport.payments.carried', {
                amount: money(moneyIn.carriedIn),
                date: formatOrderDate(start, intlLocale),
              })
            : null,
          rows: moneyIn.entries.map((e, i) =>
            e.type === 'payout'
              ? {
                  id: `p${i}`,
                  kind: 'payout' as const,
                  text: t('partnerReport.payments.payout'),
                  date: entryDate(e.at),
                  amount: money(e.payout.amount),
                  tone: 'success' as const,
                }
              : e.type === 'adjustment'
                ? {
                    id: `a${i}`,
                    kind: 'adjustment' as const,
                    text: t('partnerReport.payments.adjustment', {
                      ref: refOf(e.adjustment.transaction.id),
                    }),
                    date: entryDate(e.at),
                    amount: `−${money(e.adjustment.commission)}`,
                    tone: 'warning' as const,
                  }
                : {
                    id: `o${i}`,
                    kind: 'offset' as const,
                    text: t('partnerReport.payments.offset', {
                      ref: e.item.ref,
                    }),
                    date: entryDate(e.at),
                    amount: money(e.amount),
                    tone: 'neutral' as const,
                  },
          ),
          totals: [
            ...(moneyIn.offset
              ? [
                  {
                    label: t('partnerReport.payments.offsetTotal'),
                    value: money(moneyIn.offset),
                  },
                ]
              : []),
            ...(moneyIn.toOffset || moneyIn.offset || moneyIn.carriedIn
              ? [
                  {
                    label: t('partnerReport.payments.stillToOffset'),
                    value: money(moneyIn.toOffset),
                  },
                ]
              : []),
          ],
        }
      : null

  return {
    /** The unformatted figures behind the views, for the dashboard (use-partner-dashboard). */
    raw: {
      report,
      moneyIn,
      allTimeData,
      previousReport,
      previousMoney,
      today,
      /** The commission chart's top gridline, in Rappen. */
      chartTop: top,
    },
    allTime,
    demoNote: withHistory.length ? t('partnerReport.demoNote') : null,
    periods: REPORT_PERIODS.map(id => ({
      id,
      label: t(periodLabels[id]),
    })),
    rangeLabel,
    previous: previousDay,
    // No paging into the future: the next period must have started by today.
    next:
      periodRange(period, shiftPeriod(period, day, 1)).start <= today
        ? shiftPeriod(period, day, 1)
        : null,
    isCurrent: today >= start && today <= end,
    kpis,
    chart,
    groups,
    rows,
    payments,
  }
}
