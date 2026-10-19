import type { DayRange, DeltaTone, PeriodId } from '@sk/domain/reporting'

import { zurichDate, zurichDayOf } from '@sk/domain/catalog'

import { deltaOf, periodRanges, PERIODS } from '@sk/domain/reporting'
import {
  calendarDay,
  dateTimeFormat,
  formatMoney,
  numberFormat,
  percentOf,
} from '@sk/domain/shared'
import { useState } from 'react'
import { useLocale } from '@/contexts/locale-context'
import { useDemoNow } from '@/features/demo'
import { useOrders } from '@/features/orders/api/queries'
import { useCommissionAdjustments, usePartners, useReferralVisits } from '@/features/partners/api/queries'
import { commissionItems } from '@/features/partners/lib/ledger'
import { linkOpens } from '@/features/partners/lib/link-opens'
import { useTourRecords } from '@/features/tours/api/queries'

/** Fixed per partner, in list order; partners beyond three share the muted colour. */
const PARTNER_COLOURS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)']

const periodLabel = {
  '7d': 'overview.period.7d',
  '30d': 'overview.period.30d',
  'month': 'overview.period.month',
} as const

const dayOf = zurichDayOf

function daysOf(range: DayRange): string[] {
  const days: string[] = []
  const d = calendarDay(range.start)

  while (d.toISOString().slice(0, 10) <= range.end) {
    days.push(d.toISOString().slice(0, 10))
    d.setUTCDate(d.getUTCDate() + 1)
  }

  return days
}

export interface PartnerKpiView {
  id: 'opens' | 'transactions' | 'conversion' | 'commission'
  label: string
  value: string
  delta: string
  deltaTone: DeltaTone
  direction: 'up' | 'down' | 'flat' | 'none'
  deltaLabel: string
  trend: number[]
}

/**
 * M15 Analytics tab (D18): link opens, partner transactions, conversion and commission for
 * the Overview's periods, opens per day by partner, and a comparison of partners. Reads the
 * same transactions as M02 and P02 (D14); archived partners keep their history here.
 */
export function usePartnerAnalytics(
  /** Exact ranges instead of the period tabs (the lab Partners' period dropdown). */
  override?: { current: DayRange, previous: DayRange },
) {
  const { t, intlLocale } = useLocale()
  const partners = usePartners()
  const orders = useOrders()
  const tours = useTourRecords()
  const adjustments = useCommissionAdjustments()
  const referralVisits = useReferralVisits()
  const now = useDemoNow()
  const [period, setPeriod] = useState<PeriodId>('30d')
  const today = zurichDate(now)
  const { current, previous } = override ?? periodRanges(period, today)
  const nowMs = now.getTime()

  const money = (rappen: number) => formatMoney(rappen / 100, intlLocale)
  const count = (n: number) => numberFormat(intlLocale).format(n)
  const percent = (part: number, whole: number) =>
    percentOf(part, whole, intlLocale, 1)
  const range = (r: DayRange) =>
    (
      dateTimeFormat(intlLocale, {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      }) as Intl.DateTimeFormat & { formatRange: (a: Date, b: Date) => string }
    ).formatRange(calendarDay(r.start), calendarDay(r.end))

  const inRange = (at: string, r: DayRange) => {
    if (Date.parse(at) > nowMs)
      return false
    const day = dayOf(at)

    return day >= r.start && day <= r.end
  }

  const opens = linkOpens({ referralVisits })
  const items = partners.flatMap(p =>
    commissionItems({ orders, tours, commissionAdjustments: adjustments }, p.id),
  )

  const totals = (r: DayRange) => {
    const o = opens.filter(x => inRange(x.at, r)).length
    const tx = items.filter(i => inRange(i.createdAt, r)).length
    const commission
      = items
        .filter(i => i.recordedAt && inRange(i.recordedAt, r))
        .reduce((sum, i) => sum + i.amount, 0)
        - adjustments
          .filter(a => inRange(a.at, r))
          .reduce((sum, a) => sum + a.commission, 0)

    return { opens: o, transactions: tx, commission }
  }
  const cur = totals(current)
  const prev = totals(previous)
  const days = daysOf(current)

  const perDay = (pick: (day: string) => number) => days.map(d => pick(d))
  // Counted once per day, and per day and partner, so each chart point is a lookup.
  const opensByDay = new Map<string, number>()

  for (const o of opens) {
    if (Date.parse(o.at) > nowMs)
      continue
    const day = dayOf(o.at)
    const withPartner = `${day}|${o.partnerId}`

    opensByDay.set(day, (opensByDay.get(day) ?? 0) + 1)
    opensByDay.set(withPartner, (opensByDay.get(withPartner) ?? 0) + 1)
  }
  const opensOn = (day: string, partnerId?: string) =>
    opensByDay.get(partnerId ? `${day}|${partnerId}` : day) ?? 0
  const transactionsOn = (day: string) =>
    items.filter(
      i => Date.parse(i.createdAt) <= nowMs && dayOf(i.createdAt) === day,
    ).length
  const commissionOn = (day: string) =>
    items
      .filter(i => i.recordedAt && dayOf(i.recordedAt) === day)
      .reduce((sum, i) => sum + i.amount, 0)

  const kpi = (
    id: PartnerKpiView['id'],
    value: number,
    before: number,
    text: string,
    trend: number[],
  ): PartnerKpiView => {
    const { delta, direction, tone } = deltaOf(value, before, 'up', intlLocale)

    return {
      id,
      label: t(`partnerAnalytics.kpi.${id}`),
      value: text,
      delta,
      deltaTone: tone,
      direction,
      deltaLabel: delta
        ? t('overview.delta.label', { delta, range: range(previous) })
        : t('overview.delta.none', { range: range(previous) }),
      trend,
    }
  }

  const conversion = (o: number, tx: number) => (o ? tx / o : 0)
  const kpis = [
    kpi('opens', cur.opens, prev.opens, count(cur.opens), perDay(opensOn)),
    kpi(
      'transactions',
      cur.transactions,
      prev.transactions,
      count(cur.transactions),
      perDay(transactionsOn),
    ),
    kpi(
      'conversion',
      conversion(cur.opens, cur.transactions),
      conversion(prev.opens, prev.transactions),
      percent(cur.transactions, cur.opens),
      perDay(d => conversion(opensOn(d), transactionsOn(d))),
    ),
    kpi(
      'commission',
      cur.commission,
      prev.commission,
      money(cur.commission),
      perDay(commissionOn),
    ),
  ]

  const series = partners
    .filter(p =>
      opens.some(o => o.partnerId === p.id && inRange(o.at, current)),
    )
    .map((p, index) => ({
      id: p.id,
      name: p.name,
      colour: PARTNER_COLOURS[index] ?? 'var(--muted)',
    }))

  const compare = partners
    .map((p) => {
      const o = opens.filter(
        x => x.partnerId === p.id && inRange(x.at, current),
      ).length
      const own = items.filter(i => i.partnerId === p.id)
      const tx = own.filter(i => inRange(i.createdAt, current)).length
      const commission
        = own
          .filter(i => i.recordedAt && inRange(i.recordedAt, current))
          .reduce((sum, i) => sum + i.amount, 0)
          - adjustments
            .filter(a => a.partnerId === p.id && inRange(a.at, current))
            .reduce((sum, a) => sum + a.commission, 0)

      return {
        id: p.id,
        name: p.name,
        isArchived: !!p.archivedAt,
        opens: count(o),
        opensValue: o,
        transactionsValue: tx,
        transactions: count(tx),
        conversion: o ? percent(tx, o) : '–',
        commission: money(commission),
        /** Rappen, for charts. */
        commissionValue: commission,
      }
    })
    .filter(row => row.opensValue > 0 || row.transactionsValue > 0)
    .sort((a, b) => b.opensValue - a.opensValue)

  return {
    period,
    onPeriodChange: setPeriod,
    periods: PERIODS.map(id => ({ id, label: t(periodLabel[id]) })),
    periodsLabel: t('overview.period.label'),
    comparison: t('overview.compare', {
      range: range(current),
      previous: range(previous),
    }),
    kpisLabel: t('partnerAnalytics.kpis'),
    kpis,
    daily: {
      title: t('partnerAnalytics.daily.title'),
      description: t('partnerAnalytics.daily.description'),
      series,
      days: days.map(day => ({
        day,
        tick:
          day === today ? t('overview.today') : String(Number(day.slice(8))),
        ...Object.fromEntries(series.map(s => [s.id, opensOn(day, s.id)])),
      })),
    },
    compare: {
      title: t('partnerAnalytics.compare.title'),
      description: t('partnerAnalytics.compare.description'),
      columns: {
        partner: t('merchantPartners.column.partner'),
        opens: t('partnerAnalytics.compare.opens'),
        transactions: t('merchantPartners.column.transactions'),
        conversion: t('partnerAnalytics.kpi.conversion'),
        commission: t('partnerAnalytics.compare.commission'),
      },
      archived: t('merchantPartners.archived'),
      rows: compare,
    },
    isEmpty: cur.opens === 0 && cur.transactions === 0,
    empty: t('partnerAnalytics.empty'),
    note: t('partnerAnalytics.note'),
  }
}

export type PartnerAnalyticsView = ReturnType<typeof usePartnerAnalytics>
