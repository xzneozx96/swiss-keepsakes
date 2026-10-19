import type { PaymentMethod } from '@sk/domain/orders'
import type { Bucket, DayRange, SalesPeriodId, SalesRange } from '@sk/domain/reporting'
import type { DeltaView } from '@/components/stat-card'
import type { ReportFilters } from '@/features/reports/lib/money'
import type { ReportTx } from '@/features/reports/lib/transactions'

import { zurichDate, zurichDayOf } from '@sk/domain/catalog'

import { addDays, bucketKey, bucketOf, bucketSlots, deltaOf, inSalesRange, SALES_PERIODS, salesRanges } from '@sk/domain/reporting'

import {
  calendarDay,
  dateTimeFormat,
  formatMoney,
  numberFormat,
  percentOf,
  pickText,
} from '@sk/domain/shared'
import { useMemo } from 'react'
import { useLocale } from '@/contexts/locale-context'
import { useProducts } from '@/features/catalog/api/queries'
import { useDemoNow } from '@/features/demo'
import { useOrders } from '@/features/orders/api/queries'
import { useCommissionAdjustments } from '@/features/partners/api/queries'
import { allOrders, transactionKey } from '@/features/partners/lib/ledger'
import { matchesFilters, NO_FILTERS } from '@/features/reports/lib/money'
import { reportTransactions } from '@/features/reports/lib/transactions'
import { useTourRecords } from '@/features/tours/api/queries'

/** A change smaller than this either way counts as stable: grey line, no arrow. */
const STABLE = 0.05

const methodLabel = {
  'online': 'merchantOrder.method.online',
  'cash': 'merchantOrder.method.cash',
  'bank-transfer': 'merchantOrder.method.bankTransfer',
  'other': 'merchantOrder.method.other',
} as const satisfies Record<PaymentMethod, string>

const zurichTime = dateTimeFormat('en-GB', {
  timeZone: 'Europe/Zurich',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})
const timeOf = (iso: string) => zurichTime.format(new Date(iso))

type Kind = 'goods' | 'tours'

/** One sale (order or booking) at the minute it was placed. */
interface Sale {
  tx: ReportTx
  kind: Kind
  day: string
  time: string
  lost: boolean
  value: number
  outstanding: number
  lines: { itemId: string, kind: Kind, quantity: number, value: number }[]
}

/** One payment received at the minute it succeeded. */
interface Payment {
  tx: ReportTx
  kind: Kind
  day: string
  time: string
  amount: number
  method: PaymentMethod
}

/** Money recorded after the sale: a refund, or partner commission (minus refunds on it). */
interface Move {
  tx: ReportTx
  kind: Kind
  day: string
  time: string
  type: 'refund' | 'commission'
  amount: number
}

export interface SalesKpi {
  id: 'value' | 'collected' | 'sales' | 'unpaid' | 'refunds' | 'commission'
  label: string
  value: string
  split: string
  /** Null when there is nothing to compare with (all time, or the unpaid card). */
  delta: DeltaView | null
  /** Shown under the value instead of a comparison. */
  note: string | null
  /** What the figure counts, under the chart. */
  hint: string
  /** The figure per bar of the chart. */
  bars: SalesBar[]
  /** The y-axis: CHF or a count. */
  isMoney: boolean
}

export interface SalesBar {
  key: string
  tick: string
  heading: string
  /** A week or month the range cuts short; drawn lighter. */
  partial: boolean
  value: number
  valueText: string
  /** The same figure for gifts and for tours: the two parts of the stacked bar. */
  gifts: number
  giftsText: string
  tours: number
  toursText: string
  previous: number | null
  previousText: string | null
}

export interface SalesTopRow {
  id: string
  name: string
  type: 'gift' | 'tour'
  sold: string
  value: string
  share: string
}

/**
 * The Sales figures for one period. Reports passes its filters; the Overview shows them all.
 */
export function useSalesOverview(
  period: SalesPeriodId,
  custom: DayRange | null,
  filters: ReportFilters = NO_FILTERS,
) {
  const { t, language, intlLocale } = useLocale()
  const orders = useOrders()
  const tours = useTourRecords()
  const products = useProducts()
  const commissionAdjustments = useCommissionAdjustments()
  const now = useDemoNow()
  const today = zurichDate(now)
  const nowTime = timeOf(now.toISOString())

  const { sales, payments, moves, firstDay } = useMemo(() => {
    const txs = new Map(
      reportTransactions({ orders, tours }).map(tx => [tx.key, tx]),
    )
    const sales: Sale[] = []
    const payments: Payment[] = []
    const moves: Move[] = []
    const add = (
      key: string,
      kind: Kind,
      createdAt: string,
      paid: {
        status: string
        amount: number
        at: string
        method: PaymentMethod
      }[],
      commissionAt: string | null | undefined,
    ) => {
      const tx = txs.get(key)

      if (!tx)
        return
      if (commissionAt && tx.commission) {
        moves.push({
          tx,
          kind,
          day: zurichDayOf(commissionAt),
          time: timeOf(commissionAt),
          type: 'commission',
          amount: tx.commission,
        })
      }
      sales.push({
        tx,
        kind,
        day: zurichDayOf(createdAt),
        time: timeOf(createdAt),
        lost: tx.status === 'lost',
        value: tx.value,
        outstanding: tx.outstanding,
        lines: tx.lines,
      })
      for (const p of paid) {
        if (p.status !== 'succeeded')
          continue
        payments.push({
          tx,
          kind,
          day: zurichDayOf(p.at),
          time: timeOf(p.at),
          amount: p.amount,
          method: p.method,
        })
      }
    }

    for (const o of allOrders({ orders })) {
      add(
        transactionKey({ kind: 'order', id: o.id }),
        'goods',
        o.createdAt,
        o.payments,
        o.commissionRecordedAt,
      )
    }
    for (const b of tours?.bookings ?? []) {
      add(
        transactionKey({ kind: 'booking', id: b.id }),
        'tours',
        b.createdAt,
        b.payments,
        b.commissionRecordedAt,
      )
    }
    // A refund gives money back and takes the partner's commission on it off again.
    for (const a of commissionAdjustments) {
      const tx = txs.get(transactionKey(a.transaction))

      if (!tx)
        continue
      const when = { day: zurichDayOf(a.at), time: timeOf(a.at) }

      moves.push({
        tx,
        kind: tx.kind,
        ...when,
        type: 'refund',
        amount: a.refunded,
      })
      moves.push({
        tx,
        kind: tx.kind,
        ...when,
        type: 'commission',
        amount: -a.commission,
      })
    }
    const firstDay = sales.reduce(
      (min, s) => (s.day < min ? s.day : min),
      '9999-12-31',
    )

    return { sales, payments, moves, firstDay }
  }, [orders, tours, commissionAdjustments])

  const { current, previous } = salesRanges(
    period,
    today,
    nowTime,
    firstDay < today ? firstDay : today,
    custom,
  )
  const bucket = bucketOf(current)

  const money = (rappen: number) => formatMoney(rappen / 100, intlLocale)
  const count = (n: number) => numberFormat(intlLocale).format(n)
  const giftOrders = (n: number) =>
    t(
      n === 1
        ? 'salesOverview.giftOrders.one'
        : 'salesOverview.giftOrders.other',
      { count: n },
    )
  const tourBookings = (n: number) =>
    t(
      n === 1
        ? 'salesOverview.tourBookings.one'
        : 'salesOverview.tourBookings.other',
      { count: n },
    )
  const pct = (part: number, whole: number) =>
    percentOf(part, whole, intlLocale)

  const shown = (x: { tx: ReportTx }) => matchesFilters(x.tx, filters)
  const placedIn = (r: SalesRange) =>
    sales.filter(s => !s.lost && shown(s) && inSalesRange(s.day, s.time, r))
  const paidIn = (r: SalesRange) =>
    payments.filter(p => shown(p) && inSalesRange(p.day, p.time, r))
  const movesIn = (r: SalesRange) =>
    moves.filter(m => shown(m) && inSalesRange(m.day, m.time, r))
  const sum = <X>(list: X[], f: (x: X) => number) =>
    list.reduce((a, x) => a + f(x), 0)
  const byKind = <X extends { kind: Kind }>(
    list: X[],
    f: (x: X) => number,
  ) => ({
    goods: sum(
      list.filter(x => x.kind === 'goods'),
      f,
    ),
    tours: sum(
      list.filter(x => x.kind === 'tours'),
      f,
    ),
  })

  const cur = {
    placed: placedIn(current),
    paid: paidIn(current),
    moves: movesIn(current),
  }
  const prev = previous && {
    placed: placedIn(previous),
    paid: paidIn(previous),
    moves: movesIn(previous),
  }

  /** Each bucket's figure, for the card lines and the chart. */
  const series = (
    r: SalesRange,
    f: (placed: Sale[], paid: Payment[], moved: Move[]) => number,
  ) => {
    const b = bucketOf(r)
    const keys = bucketSlots(r, b).map(slot => slot.key)
    const placed = new Map<string, Sale[]>()
    const paid = new Map<string, Payment[]>()
    const moved = new Map<string, Move[]>()

    for (const m of movesIn(r)) {
      const k = bucketKey(m.day, m.time, b, r)

      moved.set(k, [...(moved.get(k) ?? []), m])
    }
    for (const s of placedIn(r)) {
      const k = bucketKey(s.day, s.time, b, r)

      placed.set(k, [...(placed.get(k) ?? []), s])
    }
    for (const p of paidIn(r)) {
      const k = bucketKey(p.day, p.time, b, r)

      paid.set(k, [...(paid.get(k) ?? []), p])
    }
    // Today: the hours still to come stay empty rather than zero.
    // Yesterday until now: the hours after it are not part of the comparison.
    const lastHour
      = b !== 'hour'
        ? '24'
        : r.until
          ? r.until.slice(0, 2)
          : r.end === today
            ? nowTime.slice(0, 2)
            : '24'

    return keys.map(k =>
      b === 'hour' && k > lastHour
        ? null
        : f(placed.get(k) ?? [], paid.get(k) ?? [], moved.get(k) ?? []),
    )
  }

  const range = (r: DayRange) =>
    (
      dateTimeFormat(intlLocale, {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      }) as Intl.DateTimeFormat & { formatRange: (a: Date, b: Date) => string }
    ).formatRange(calendarDay(r.start), calendarDay(r.end))
  const rangeText = (r: SalesRange) =>
    r.until
      ? t('salesOverview.until', { range: range(r), time: r.until })
      : range(r)

  const delta = (value: number, before: number, polarity: 'up' | 'down') => {
    // No chip at all when there is nothing earlier: the card says so in words.
    if (!previous || !before)
      return null
    const d = deltaOf(value, before, polarity, intlLocale)
    const change = before ? (value - before) / before : null
    const stable = change !== null && Math.abs(change) < STABLE

    return {
      text: d.delta,
      tone: stable ? 'neutral' : d.tone,
      direction: stable ? 'flat' : d.direction,
      label: d.delta
        ? t('salesOverview.delta', {
            delta: d.delta,
            range: rangeText(previous),
          })
        : t('salesOverview.deltaNone', { range: rangeText(previous) }),
    } satisfies DeltaView
  }

  const valueSplit = byKind(cur.placed, s => s.value)
  const paidSplit = byKind(cur.paid, p => p.amount)
  const salesSplit = byKind(cur.placed, () => 1)
  const unpaidSplit = byKind(cur.placed, s => s.outstanding)
  const valueTotal = valueSplit.goods + valueSplit.tours
  const unpaidTotal = unpaidSplit.goods + unpaidSplit.tours
  const moneySplit = (s: { goods: number, tours: number }) =>
    t('salesOverview.split', {
      gifts: money(s.goods),
      tours: money(s.tours),
    })

  const valueDelta = delta(
    valueTotal,
    prev ? sum(prev.placed, s => s.value) : 0,
    'up',
  )
  const paidDelta = delta(
    paidSplit.goods + paidSplit.tours,
    prev ? sum(prev.paid, p => p.amount) : 0,
    'up',
  )
  const salesDelta = delta(cur.placed.length, prev?.placed.length ?? 0, 'up')

  const slots = bucketSlots(current, bucket)

  const fmt = (o: Intl.DateTimeFormatOptions) =>
    dateTimeFormat(intlLocale, { ...o, timeZone: 'UTC' })
  const at = (k: string) => calendarDay(k)
  const label = (
    k: string,
    b: Bucket,
    slot: DayRange,
  ): { tick: string, heading: string } => {
    switch (b) {
      case 'hour':
        return { tick: `${k}:00`, heading: `${k}:00–${k}:59` }
      case 'day':
        return {
          tick: fmt({ day: 'numeric', month: 'numeric' }).format(at(k)),
          heading: fmt({
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          }).format(at(k)),
        }
      case 'week':
        return {
          tick: fmt({ day: 'numeric', month: 'short' }).format(at(slot.start)),
          heading: range(slot),
        }
      case 'month':
        return {
          tick: fmt({ month: 'short' }).format(at(k)),
          heading: fmt({ month: 'long', year: 'numeric' }).format(at(k)),
        }
    }
  }
  /** One figure per bar, with the previous period's figure at the same place for the tooltip. */
  const barsOf = (
    f: (placed: Sale[], paid: Payment[], moved: Move[]) => number,
    format: (n: number) => string,
  ): SalesBar[] => {
    const now = series(current, f)
    const only
      = (kind: Kind) => (placed: Sale[], paid: Payment[], moved: Move[]) =>
        f(
          placed.filter(x => x.kind === kind),
          paid.filter(x => x.kind === kind),
          moved.filter(x => x.kind === kind),
        )
    const gifts = series(current, only('goods'))
    const toursPart = series(current, only('tours'))
    const before = previous ? series(previous, f) : []

    return slots.map((slot, i) => {
      const value = now[i]
      const was = previous ? (before[i] ?? null) : null

      return {
        key: slot.key,
        ...label(slot.key, bucket, slot),
        partial: slot.partial,
        value: value ?? 0,
        valueText: value === null ? '–' : format(value),
        gifts: gifts[i] ?? 0,
        giftsText: format(gifts[i] ?? 0),
        tours: toursPart[i] ?? 0,
        toursText: format(toursPart[i] ?? 0),
        previous: was,
        previousText: was === null ? null : format(was),
      }
    })
  }

  const kpis: SalesKpi[] = [
    {
      id: 'value',
      label: t('salesOverview.value'),
      value: money(valueTotal),
      split: moneySplit(valueSplit),
      delta: valueDelta,
      note: valueDelta ? null : t('salesOverview.noCompare'),
      hint: t('salesOverview.value.hint'),
      bars: barsOf(placed => sum(placed, s => s.value), money),
      isMoney: true,
    },
    {
      id: 'collected',
      label: t('salesOverview.collected'),
      value: money(paidSplit.goods + paidSplit.tours),
      split: moneySplit(paidSplit),
      delta: paidDelta,
      note: paidDelta ? null : t('salesOverview.noCompare'),
      hint: t('salesOverview.collected.hint'),
      bars: barsOf((_, paid) => sum(paid, p => p.amount), money),
      isMoney: true,
    },
    {
      id: 'sales',
      label: t('salesOverview.orders'),
      value: count(cur.placed.length),
      split: `${giftOrders(salesSplit.goods)} · ${tourBookings(salesSplit.tours)}`,
      delta: salesDelta,
      note: salesDelta ? null : t('salesOverview.noCompare'),
      hint: t('salesOverview.orders.hint'),
      bars: barsOf(placed => placed.length, count),
      isMoney: false,
    },
    {
      id: 'unpaid',
      label: t('salesOverview.unpaid'),
      value: money(unpaidTotal),
      split: moneySplit(unpaidSplit),
      delta: null,
      note: t('salesOverview.unpaid.share', {
        share: pct(unpaidTotal, valueTotal),
      }),
      hint: t('salesOverview.unpaid.hint'),
      bars: barsOf(placed => sum(placed, s => s.outstanding), money),
      isMoney: true,
    },
  ]

  // Reports only: refunds and commission, recorded on the day the money moved.
  const moveTotal = (list: Move[], type: Move['type']) =>
    sum(
      list.filter(m => m.type === type),
      m => m.amount,
    )
  const moveKpi = (
    id: 'refunds' | 'commission',
    type: Move['type'],
    polarity: 'up' | 'down',
  ): SalesKpi => {
    const split = byKind(
      cur.moves.filter(m => m.type === type),
      m => m.amount,
    )
    const d = delta(
      split.goods + split.tours,
      prev ? moveTotal(prev.moves, type) : 0,
      polarity,
    )

    return {
      id,
      label: t(`salesOverview.${id}`),
      value: money(split.goods + split.tours),
      split: moneySplit(split),
      // Commission up or down is neither good nor bad for the shop: a neutral chip.
      delta: d && id === 'commission' ? { ...d, tone: 'neutral' } : d,
      note: d ? null : t('salesOverview.noCompare'),
      hint: t(`salesOverview.${id}.hint`),
      bars: barsOf((_, __, moved) => moveTotal(moved, type), money),
      isMoney: true,
    }
  }
  const extra = [
    moveKpi('refunds', 'refund', 'down'),
    moveKpi('commission', 'commission', 'up'),
  ]

  // Reports only: payment methods of the money collected.
  const methodTotals = new Map<
    PaymentMethod,
    { amount: number, goods: number, tours: number }
  >()

  for (const p of cur.paid) {
    const m = methodTotals.get(p.method) ?? { amount: 0, goods: 0, tours: 0 }

    m.amount += p.amount
    m[p.kind === 'goods' ? 'goods' : 'tours'] += p.amount
    methodTotals.set(p.method, m)
  }
  const paidTotal = paidSplit.goods + paidSplit.tours
  const methods = [...methodTotals.entries()]
    .sort((a, b) => b[1].amount - a[1].amount)
    .map(([id, m]) => ({
      id,
      label: t(methodLabel[id]),
      value: money(m.amount),
      share: paidTotal ? m.amount / paidTotal : 0,
      shareText: pct(m.amount, paidTotal),
      /** What came in this way for keepsakes and for tours. */
      gifts: money(m.goods),
      tours: money(m.tours),
    }))

  // Top sellers: gifts and tours together, by sales value.
  const nameOf = (id: string, kind: Kind) => {
    const item
      = kind === 'goods'
        ? products.find(p => p.id === id)
        : tours?.tours.find(x => x.id === id)

    return item ? pickText(item.name, language).text : id
  }
  const items = new Map<
    string,
    { kind: Kind, quantity: number, value: number }
  >()

  for (const s of cur.placed) {
    for (const l of s.lines) {
      const row = items.get(l.itemId) ?? {
        kind: l.kind,
        quantity: 0,
        value: 0,
      }

      row.quantity += l.quantity
      row.value += l.value
      items.set(l.itemId, row)
    }
  }
  /** Every gift and tour sold in the period, best first (Reports pages through them all). */
  const sellers: SalesTopRow[] = [...items.entries()]
    .sort((a, b) => b[1].value - a[1].value)
    .map(([id, r]) => ({
      id,
      name: nameOf(id, r.kind),
      type: r.kind === 'goods' ? 'gift' : 'tour',
      sold:
        r.kind === 'goods'
          ? t('salesOverview.top.units', { count: r.quantity })
          : t(
              r.quantity === 1
                ? 'salesOverview.top.guests.one'
                : 'salesOverview.top.guests.other',
              { count: r.quantity },
            ),
      value: money(r.value),
      share: pct(r.value, valueTotal),
    }))

  // All time, whatever the period: the total, where it stands, the last 30 days against the
  // 30 before, and the last seven months (Overview › Sales only; Reports ignores it).
  const placedAll = sales.filter(s => !s.lost && shown(s))
  const totalAll = byKind(placedAll, s => s.value)
  const collectedAll = sum(payments.filter(shown), p => p.amount)
  const unpaidAll = sum(placedAll, s => s.outstanding)
  const valueIn = (r: DayRange) =>
    sum(
      placedAll.filter(s => s.day >= r.start && s.day <= r.end),
      s => s.value,
    )
  const last30 = valueIn({ start: addDays(today, -29), end: today })
  const before30 = valueIn({
    start: addDays(today, -59),
    end: addDays(today, -30),
  })
  const change = deltaOf(last30, before30, 'up', intlLocale)
  const firstMonth = `${(firstDay < today ? firstDay : today).slice(0, 8)}01`
  const monthStart = (back: number) => {
    const d = new Date(`${today.slice(0, 8)}01T12:00:00Z`)

    d.setUTCMonth(d.getUTCMonth() - back)

    return d.toISOString().slice(0, 10)
  }
  const monthFmt = (o: Intl.DateTimeFormatOptions, iso: string) =>
    dateTimeFormat(intlLocale, { ...o, timeZone: 'UTC' }).format(
      calendarDay(iso),
    )
  const months = Array.from({ length: 7 }, (_, i) => {
    const id = monthStart(6 - i)
    const inMonth = placedAll.filter(
      s => s.day.slice(0, 7) === id.slice(0, 7),
    )
    const split = byKind(inMonth, s => s.value)
    const hasData = id >= firstMonth
    const label = monthFmt({ month: 'long', year: 'numeric' }, id)

    return {
      id,
      tick: monthFmt({ month: 'short' }, id),
      label,
      hasData,
      goods: hasData ? split.goods : 0,
      tours: hasData ? split.tours : 0,
      total: hasData ? split.goods + split.tours : 0,
      valueText: hasData ? money(split.goods + split.tours) : '–',
      isCurrent: i === 6,
      ariaLabel: t('salesOverview.months.open', {
        month: label,
        value: hasData ? money(split.goods + split.tours) : '–',
      }),
    }
  })
  const allTime = {
    since: monthFmt(
      { day: 'numeric', month: 'long', year: 'numeric' },
      firstDay < today ? firstDay : today,
    ),
    total: money(totalAll.goods + totalAll.tours),
    delta: change.delta
      ? ({
          text: change.delta,
          tone: change.tone,
          direction: change.direction,
          label: t('salesOverview.allTime.delta', { delta: change.delta }),
        } satisfies DeltaView)
      : null,
    sentence: t('salesOverview.allTime.sentence', {
      last: money(last30),
      previous: money(before30),
    }),
    parts: [
      {
        id: 'collected',
        label: t('salesOverview.collected'),
        amount: collectedAll,
        value: money(collectedAll),
        colour: 'var(--chart-1)',
      },
      {
        id: 'unpaid',
        label: t('salesOverview.unpaidShort'),
        amount: Math.max(0, unpaidAll),
        value: money(unpaidAll),
        colour: 'var(--chart-1-light)',
      },
    ],
    months,
  }

  return {
    periods: SALES_PERIODS.map(id => ({
      id,
      label: t(`salesOverview.period.${id}`),
    })),
    current,
    previous,
    rangeText: rangeText(current),
    comparison: previous
      ? t('salesOverview.comparedWith', { range: rangeText(previous) })
      : t('salesOverview.noCompare'),
    kpis,
    bucketLabel: t(`salesOverview.bucket.${bucket}`),
    hasPrevious: !!previous,
    top: sellers.slice(0, 5),
    sellers,
    extra,
    methods,
    paidTotal: money(paidTotal),
    mix: (['goods', 'tours'] as const).map(kind => ({
      id: kind,
      label: t(
        kind === 'goods' ? 'salesOverview.gifts' : 'salesOverview.tours',
      ),
      value: money(valueSplit[kind]),
      share: valueTotal ? valueSplit[kind] / valueTotal : 0,
      shareText: pct(valueSplit[kind], valueTotal),
      /** Collected against what is still unpaid on these sales, 0–1. */
      paidShare:
        paidSplit[kind] + unpaidSplit[kind]
          ? paidSplit[kind] / (paidSplit[kind] + unpaidSplit[kind])
          : 0,
      orders:
        kind === 'goods'
          ? giftOrders(salesSplit.goods)
          : tourBookings(salesSplit.tours),
      facts: [
        {
          id: 'collected',
          label: t('salesOverview.collected'),
          value: money(paidSplit[kind]),
        },
        {
          id: 'unpaid',
          label: t('salesOverview.unpaidShort'),
          value: money(unpaidSplit[kind]),
        },
      ],
    })),
    isEmpty: cur.placed.length === 0 && cur.paid.length === 0,
    today,
    firstDay,
    allTime,
  }
}

export type SalesOverviewView = ReturnType<typeof useSalesOverview>
