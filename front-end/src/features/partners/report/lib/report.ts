import type { LocalizedText, Rappen } from '@sk/domain/catalog'
import type { CommissionState } from '@sk/domain/orders'
import type { QueriedData } from '@/features/demo/types'
import type { OrderLabel } from '@/features/orders/lib/labels'

import { zurichDate } from '@sk/domain/catalog'
import {
  commission,
  lineTotal,
  orderTotal,
} from '@sk/domain/orders'
import { calendarDay, dateTimeFormat } from '@sk/domain/shared'
import { zurichWeek } from '@/features/merchant/today/lib/today'
import { commissionLabel, progressLabel } from '@/features/orders/lib/labels'

export type ReportPeriod = 'day' | 'week' | 'month'

export const REPORT_PERIODS: ReportPeriod[] = ['day', 'week', 'month']

export const DEFAULT_REPORT_PERIOD: ReportPeriod = 'month'

export function isReportPeriod(value: unknown): value is ReportPeriod {
  return REPORT_PERIODS.includes(value as ReportPeriod)
}

/** Zurich calendar days, YYYY-MM-DD, both inclusive. */
export interface DateRange {
  start: string
  end: string
}

function addDays(isoDate: string, days: number): string {
  const d = calendarDay(isoDate)

  d.setUTCDate(d.getUTCDate() + days)

  return d.toISOString().slice(0, 10)
}

/** The day, Monday-to-Sunday week or calendar month that contains `anchor`. */
export function periodRange(period: ReportPeriod, anchor: string): DateRange {
  if (period === 'day')
    return { start: anchor, end: anchor }
  if (period === 'week')
    return zurichWeek(calendarDay(anchor))
  const start = `${anchor.slice(0, 7)}-01`
  const nextMonth = calendarDay(start)

  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1)

  return { start, end: addDays(nextMonth.toISOString().slice(0, 10), -1) }
}

/** First day of the period before (-1) or after (+1) the one containing `anchor`. */
export function shiftPeriod(
  period: ReportPeriod,
  anchor: string,
  step: -1 | 1,
): string {
  const { start, end } = periodRange(period, anchor)

  return step === 1
    ? addDays(end, 1)
    : periodRange(period, addDays(start, -1)).start
}

/**
 * One transaction as the partner may see it (R15, AC12): reference, order date, guest
 * name, products, value, status and commission. No contact, engraving, pickup or payment.
 */
export interface ReportRow {
  id: string
  ref: string
  createdAt: string
  guestName: string
  lines: { productName: LocalizedText, quantity: number }[]
  value: Rappen
  status: OrderLabel
  commission: { state: CommissionState, amount: Rappen, label: OrderLabel }
}

export interface ReportGroup {
  /** A store sub-category, or "tours" for tour bookings (step 2.13). */
  subcategoryId: string
  /** Orders with at least one line in this group. */
  orders: number
  value: Rappen
  recorded: Rappen
  estimated: Rappen
}

/**
 * One column of the P02 commission chart: an hour of the day, a day of the week, or the part
 * of a Monday-to-Sunday week that falls inside the month. Sums over the same rows as the
 * headline numbers, so the columns add up to `earned` and `estimated`.
 */
export interface ReportBucket {
  /** First Zurich day of the bucket, YYYY-MM-DD. */
  start: string
  /** Last Zurich day of the bucket; equals `start` for days and hours. */
  end: string
  /** Zurich hour 0–23 for hour buckets (period "day"). */
  hour?: number
  recorded: Rappen
  estimated: Rappen
  /** Orders placed in the bucket, cancelled and declined included. */
  orders: number
  /** Starts after now: no data yet, so it is not drawn as 0. */
  isFuture: boolean
  /** Contains now: still running. */
  isCurrent: boolean
}

export interface PartnerReport {
  range: DateRange
  /** Newest order first. */
  rows: ReportRow[]
  /** Recorded commission; no refunds before Phase 3, so no adjustments yet. */
  earned: Rappen
  /** Payouts (M16) arrive in Phase 5; none are recorded in flow 1. */
  paid: Rappen
  toPay: Rappen
  /** Commission on open orders, not counted in `earned` until they complete. */
  estimated: Rappen
  groups: ReportGroup[]
  /** Orders per commission state: completed (recorded), open (estimated), cancelled or declined; never "none" (all rows have this partner). */
  counts: Record<CommissionState, number>
  buckets: ReportBucket[]
}

// Built once, as zurichDate's: the "day" period asks for the hour of every row per bucket.
const zurichHourFormat = dateTimeFormat('en-GB', {
  timeZone: 'Europe/Zurich',
  hour: '2-digit',
  hourCycle: 'h23',
})

export function zurichHour(at: Date): number {
  return Number(zurichHourFormat.format(at))
}

/** Empty columns for the period: 24 hours, 7 days, or the month cut into Monday-to-Sunday weeks. */
function emptyBuckets(
  period: ReportPeriod,
  range: DateRange,
  now: Date,
): ReportBucket[] {
  const today = zurichDate(now)
  const base = { recorded: 0, estimated: 0, orders: 0 }

  if (period === 'day') {
    const hour = zurichHour(now)

    return Array.from({ length: 24 }, (_, h) => ({
      ...base,
      start: range.start,
      end: range.start,
      hour: h,
      isFuture: range.start > today || (range.start === today && h > hour),
      isCurrent: range.start === today && h === hour,
    }))
  }

  const buckets: ReportBucket[] = []

  for (let day = range.start; day <= range.end;) {
    const weekEnd = period === 'week' ? day : zurichWeek(calendarDay(day)).end
    const end = weekEnd < range.end ? weekEnd : range.end

    buckets.push({
      ...base,
      start: day,
      end,
      isFuture: day > today,
      isCurrent: today >= day && today <= end,
    })
    day = addDays(end, 1)
  }

  return buckets
}

/**
 * P02 for one partner and period, filtered by the Zurich order date. Commission comes from
 * T0 `commission()`; cancelled and declined orders ("not-applicable") stay in the list but
 * add nothing to the numbers or the groups, so the groups sum to the headline numbers.
 */
export function partnerReport(
  data: Pick<
    QueriedData,
    'orders' | 'guests' | 'products' | 'subcategories' | 'tours'
  >,
  partnerId: string,
  period: ReportPeriod,
  anchor: string,
  now: Date = new Date(),
  /** Any range of days instead of the period around `anchor` (the dashboard's period picker). */
  rangeOverride?: DateRange,
): PartnerReport {
  const range = rangeOverride ?? periodRange(period, anchor)
  const buckets = emptyBuckets(period, range, now)
  const counts: Record<CommissionState, number> = {
    'recorded': 0,
    'estimated': 0,
    'not-applicable': 0,
    'none': 0,
  }
  const orders = data.orders
    .filter(o => o.partnerId === partnerId)
    .filter((o) => {
      const day = zurichDate(new Date(o.createdAt))

      return day >= range.start && day <= range.end
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const groups = new Map<string, ReportGroup>()
  let earned = 0
  let estimated = 0

  const rows = orders.map((order): ReportRow => {
    const fees = commission(order)
    const earns = fees.state === 'recorded' || fees.state === 'estimated'
    const placed = new Date(order.createdAt)
    const day = zurichDate(placed)
    // Every row lies in the range, so it always has a bucket.
    const bucket = buckets.find(b =>
      b.hour === undefined
        ? day >= b.start && day <= b.end
        : b.hour === zurichHour(placed),
    )!

    counts[fees.state] += 1
    bucket.orders += 1

    if (earns) {
      if (fees.state === 'recorded') {
        earned += fees.total
        bucket.recorded += fees.total
      }
      else {
        estimated += fees.total
        bucket.estimated += fees.total
      }
      const seen = new Set<string>()

      order.lines.forEach((line, i) => {
        const subcategoryId = data.products.find(
          p => p.id === line.productId,
        )?.subcategoryId

        if (!subcategoryId)
          return
        const group = groups.get(subcategoryId) ?? {
          subcategoryId,
          orders: 0,
          value: 0,
          recorded: 0,
          estimated: 0,
        }
        const amount = fees.lines[i].amount

        if (!seen.has(subcategoryId))
          group.orders += 1
        seen.add(subcategoryId)
        group.value += lineTotal(line)
        if (fees.state === 'recorded')
          group.recorded += amount
        else group.estimated += amount
        groups.set(subcategoryId, group)
      })
    }

    return {
      id: order.id,
      ref: order.ref,
      createdAt: order.createdAt,
      guestName: data.guests.find(g => g.id === order.guestId)?.name ?? '',
      lines: order.lines.map(l => ({
        productName: l.productName,
        quantity: l.quantity,
      })),
      value: orderTotal(order),
      status: progressLabel(order, 'staff'),
      commission: {
        state: fees.state,
        amount: earns ? fees.total : 0,
        label: commissionLabel(fees.state),
      },
    }
  })

  const paid = 0

  return {
    range,
    rows: rows.sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    ),
    earned,
    paid,
    toPay: earned - paid,
    estimated,
    groups: data.subcategories.flatMap(c => groups.get(c.id) ?? []),
    counts,
    buckets,
  }
}

export const ALL_TIME_MONTHS = 7

/** The P02 all-time commission summary (step 1.9t), counted by order date like the report. */
export interface PartnerAllTime {
  /** Zurich day of the partner's first order. */
  firstDay: string
  earned: Rappen
  /** Payouts (M16) arrive in Phase 5; none are recorded in flow 1. */
  paid: Rappen
  toPay: Rappen
  /** Commission on open orders, not yet earned. */
  estimated: Rappen
  /** Earned on orders from the last 30 days and the 30 before. */
  last30: Rappen
  previous30: Rappen
  previousRange: DateRange
  /**
   * The last seven calendar months, oldest first; the last one is running. `earned` is null
   * for months before the first order: no data, so not drawn as 0.
   */
  months: { start: string, earned: Rappen | null }[]
}

/** All-time commission for one partner; null when the partner has no orders yet. */
export function partnerAllTime(
  orders: Pick<QueriedData, 'orders'>['orders'],
  partnerId: string,
  today: string,
): PartnerAllTime | null {
  // Orders as one list of date + commission. Tour bookings are dormant (ADR-012).
  const mine = [
    ...orders
      .filter(o => o.partnerId === partnerId)
      .map(o => ({ createdAt: o.createdAt, fees: commission(o) })),
  ]

  if (!mine.length)
    return null
  const last = { start: addDays(today, -29), end: today }
  const previousRange = {
    start: addDays(today, -59),
    end: addDays(today, -30),
  }
  const firstDay = mine
    .map(o => zurichDate(new Date(o.createdAt)))
    .reduce((a, b) => (a < b ? a : b))
  const months = Array.from({ length: ALL_TIME_MONTHS }, (_, i) => {
    const d = new Date(`${today.slice(0, 7)}-01T12:00:00Z`)

    d.setUTCMonth(d.getUTCMonth() + i - ALL_TIME_MONTHS + 1)
    const start = d.toISOString().slice(0, 10)

    return {
      start,
      earned: start.slice(0, 7) < firstDay.slice(0, 7) ? null : 0,
    }
  })
  const summary: PartnerAllTime = {
    firstDay,
    earned: 0,
    paid: 0,
    toPay: 0,
    estimated: 0,
    last30: 0,
    previous30: 0,
    previousRange,
    months,
  }

  for (const { createdAt, fees } of mine) {
    const day = zurichDate(new Date(createdAt))

    if (fees.state === 'estimated')
      summary.estimated += fees.total
    if (fees.state !== 'recorded')
      continue
    summary.earned += fees.total
    if (day >= last.start && day <= last.end)
      summary.last30 += fees.total
    if (day >= previousRange.start && day <= previousRange.end)
      summary.previous30 += fees.total
    const month = months.find(m => m.start.slice(0, 7) === day.slice(0, 7))

    if (month)
      month.earned = (month.earned ?? 0) + fees.total
  }
  summary.toPay = summary.earned - summary.paid

  return summary
}
