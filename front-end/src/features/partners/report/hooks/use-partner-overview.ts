import type { DayRange, SalesPeriodId } from '@sk/domain/reporting'
import type { MixPart } from './use-partner-dashboard'
import type { DeltaView } from '@/components/stat-card'
import type { SalesKpi } from '@/features/merchant/sales/hooks/use-sales-overview'

import { zurichDate } from '@sk/domain/catalog'

import { bucketOf, bucketSlots, deltaOf } from '@sk/domain/reporting'

import { calendarDay, dateTimeFormat, formatMoney } from '@sk/domain/shared'

import { useMemo } from 'react'
import { useLocale } from '@/contexts/locale-context'
import { useDemoNow } from '@/features/demo'
import { useSalesOverview } from '@/features/merchant/sales/hooks/use-sales-overview'
import { useOrders } from '@/features/orders/api/queries'
import { useCommissionAdjustments, usePartnerPayouts } from '@/features/partners/api/queries'
import { partnerLedger } from '@/features/partners/lib/ledger'
import { NO_FILTERS } from '@/features/reports/lib/money'
import { useTourRecords } from '@/features/tours/api/queries'
import { periodMoney } from '../lib/payouts'
import { zurichHour } from '../lib/report'
import { usePartnerDashboard } from './use-partner-dashboard'

/** A change smaller than this either way counts as stable, as on the Sales overview. */
const STABLE = 0.05

/** The keepsakes side of the split, with what the tile under the donut shows. */
export interface MixSide extends MixPart {
  recorded: string
  estimated: string
  /** Recorded part of the side's commission, 0–1: the meter. */
  recordedShare: number
  /** "16 keepsake orders", from the Sales engine. */
  orders: string
}

export interface SingleBar {
  key: string
  tick: string
  heading: string
  /** A week or month the range cuts short; drawn lighter. */
  partial: boolean
  /** null: the hour has not come yet, so no bar rather than 0. */
  value: number | null
  valueText: string
}

/** A figure that is one amount per bar (payouts, the running balance), not a keepsakes split. */
export interface SingleFigure {
  id: 'paid' | 'to-pay'
  label: string
  value: string
  delta: DeltaView | null
  note: string
  hint: string
  bars: SingleBar[]
}

/**
 * The P02 dashboard for any range of days: the Sales overview's engine filtered to this
 * partner (commission and orders), the partner ledger for what
 * was paid out and what was still owed, and the period report for the transactions, the
 * payments log, the all-time balance and the commission split.
 */
export function usePartnerOverview(
  partnerId: string,
  period: SalesPeriodId,
  custom: DayRange | null,
) {
  const { t, intlLocale } = useLocale()
  const orders = useOrders()
  const tours = useTourRecords()
  const commissionAdjustments = useCommissionAdjustments()
  const partnerPayouts = usePartnerPayouts()
  const now = useDemoNow()
  const nowMs = now.getTime()
  const today = zurichDate(now)
  const sales = useSalesOverview(period, custom, {
    ...NO_FILTERS,
    source: partnerId,
  })
  const dash = usePartnerDashboard(partnerId, 'month', undefined, {
    start: sales.current.start,
    end: sales.current.end,
  })
  const ledger = useMemo(
    () =>
      partnerLedger(
        { orders, tours, commissionAdjustments, partnerPayouts },
        partnerId,
        new Date(nowMs),
      ),
    [orders, tours, commissionAdjustments, partnerPayouts, partnerId, nowMs],
  )
  const money = (rappen: number) => formatMoney(rappen / 100, intlLocale)
  const { moneyIn } = dash.raw
  const previousMoney = sales.previous
    ? periodMoney(
        { orders, tours, commissionAdjustments, partnerPayouts },
        partnerId,
        sales.previous,
        new Date(nowMs),
      )
    : null

  const previousRange = sales.previous
    ? (
        dateTimeFormat(intlLocale, {
          day: 'numeric',
          month: 'short',
          timeZone: 'UTC',
        }) as Intl.DateTimeFormat & { formatRange: (a: Date, b: Date) => string }
      ).formatRange(
        calendarDay(sales.previous.start),
        calendarDay(sales.previous.end),
      )
    : ''
  const delta = (value: number, before: number): DeltaView | null => {
    if (!sales.previous || !before)
      return null
    const d = deltaOf(value, before, 'up', intlLocale)
    const stable = Math.abs((value - before) / before) < STABLE

    return {
      text: d.delta,
      tone: stable ? 'neutral' : d.tone,
      direction: stable ? 'flat' : d.direction,
      label: d.delta
        ? t('salesOverview.delta', { delta: d.delta, range: previousRange })
        : t('salesOverview.deltaNone', { range: previousRange }),
    }
  }

  // The bars of both single figures follow the Sales bars one to one.
  const slots = bucketSlots(sales.current, bucketOf(sales.current))
  const frame = sales.kpis[0].bars
  const isHours = bucketOf(sales.current) === 'hour'
  const hourNow = Number(
    dateTimeFormat('en-GB', {
      timeZone: 'Europe/Zurich',
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(nowMs)),
  )
  const dayOf = (at: string) => zurichDate(new Date(at))
  const inSlot = (at: string, i: number) => {
    const slot = slots[i]

    if (isHours) {
      return (
        dayOf(at) === slot.start
        && zurichHour(new Date(at)) === Number(slot.key)
      )
    }

    return dayOf(at) >= slot.start && dayOf(at) <= slot.end
  }
  const upToSlotEnd = (at: string, i: number) => {
    const slot = slots[i]

    if (isHours) {
      return (
        dayOf(at) < slot.start
        || (dayOf(at) === slot.start
          && zurichHour(new Date(at)) <= Number(slot.key))
      )
    }

    return dayOf(at) <= slot.end
  }
  const notYet = (i: number) =>
    isHours
      ? sales.current.end === today && Number(slots[i].key) > hourNow
      : slots[i].start > today

  const paidBars: SingleBar[] = slots.map((_, i) => {
    const value = notYet(i)
      ? null
      : ledger.entries
          .filter(e => e.type === 'payout' && inSlot(e.at, i))
          .reduce(
            (sum, e) => sum + (e.type === 'payout' ? e.payout.amount : 0),
            0,
          )

    return {
      key: frame[i].key,
      tick: frame[i].tick,
      heading: frame[i].heading,
      partial: frame[i].partial,
      value,
      valueText: value === null ? '–' : money(value),
    }
  })
  const toPayBars: SingleBar[] = slots.map((_, i) => {
    const value = notYet(i)
      ? null
      : (ledger.entries.filter(e => upToSlotEnd(e.at, i)).at(-1)?.toPay ?? 0)

    return {
      key: frame[i].key,
      tick: frame[i].tick,
      heading: frame[i].heading,
      partial: frame[i].partial,
      value,
      valueText: value === null ? '–' : money(value),
    }
  })

  const paid: SingleFigure = {
    id: 'paid',
    label: t('partnerReport.number.paid'),
    value: money(moneyIn.paid),
    delta: delta(moneyIn.paid, previousMoney?.paid ?? 0),
    note: moneyIn.payouts
      ? t(
          moneyIn.payouts === 1
            ? 'partnerReport.number.paid.hintOne'
            : 'partnerReport.number.paid.hintOther',
          { count: moneyIn.payouts },
        )
      : t('partnerReport.number.paid.hintNone'),
    hint: t('partnerDash.fig.paid.hint'),
    bars: paidBars,
  }
  const toPay: SingleFigure = {
    id: 'to-pay',
    label: t('partnerReport.number.toPay'),
    value: money(moneyIn.toPay),
    delta: null,
    note: moneyIn.toOffset
      ? t('partnerReport.number.toPay.hintOffset', {
          amount: money(moneyIn.toOffset),
        })
      : t('partnerReport.number.toPay.hintAfter'),
    hint: t('partnerDash.fig.toPay.hint'),
    bars: toPayBars,
  }

  const kpiOf = (id: SalesKpi['id']) =>
    sales.kpis.find(k => k.id === id)
    ?? sales.extra.find(k => k.id === id)!
  const total = (
    bars: SalesKpi['bars'],
    f: (b: SalesKpi['bars'][number]) => number,
  ) => bars.reduce((sum, b) => sum + f(b), 0)
  const commissionBase = kpiOf('commission')
  // Never negative (D16): a refund larger than the period's commission shows as its own line
  // in the note and in "Payments and adjustments"; the bars may still dip below zero.
  const commissionNow = total(commissionBase.bars, b => b.value)
  const commissionBefore = total(commissionBase.bars, b => b.previous ?? 0)
  const commissionDelta = delta(
    Math.max(0, commissionNow),
    Math.max(0, commissionBefore),
  )
  const commission: SalesKpi = {
    ...commissionBase,
    label: t('partnerReport.number.earned'),
    value: money(Math.max(0, commissionNow)),
    // The Sales chip is grey (commission is a cost to the shop); here it is the partner's income.
    delta: commissionDelta,
    note: moneyIn.adjusted
      ? `${commissionBase.split} · ${t(
        'partnerReport.number.earned.hintRefund',
        {
          recorded: money(commissionNow + moneyIn.adjusted),
          refund: money(moneyIn.adjusted),
        },
      )}`
      : commissionDelta
        ? null
        : commissionBase.note,
    hint: t('partnerDash.fig.commission.hint'),
  }
  const ordersBase = kpiOf('sales')
  const notCounted = Math.max(
    0,
    dash.rows.length - total(ordersBase.bars, b => b.value),
  )
  const ordersKpi: SalesKpi = {
    ...ordersBase,
    label: t('partnerReport.number.orders'),
    hint: notCounted
      ? t('partnerDash.fig.orders.hintExcluded', { count: notCounted })
      : t('partnerDash.fig.orders.hint'),
  }

  const groupsRaw = dash.raw.report.groups
  const sum = (f: (g: (typeof groupsRaw)[number]) => number) =>
    groupsRaw.reduce((a, g) => a + f(g), 0)
  const side = {
    keepsakes: {
      recorded: sum(g => g.recorded),
      estimated: sum(g => g.estimated),
    },
  }
  const mix = {
    ...dash.mix,
    parts: dash.mix.parts.map((p): MixSide => {
      const own = side[p.id]
      const both = own.recorded + own.estimated

      return {
        ...p,
        recorded: money(own.recorded),
        estimated: money(own.estimated),
        recordedShare: both ? own.recorded / both : 0,
        orders: sales.mix[0].orders,
      }
    }),
  }

  return {
    sales,
    commission,
    orders: ordersKpi,
    paid,
    toPay,
    rows: dash.rows,
    payments: dash.payments,
    balance: dash.balance,
    months: dash.months,
    mix,
    groups: dash.groups,
    demoNote: dash.demoNote,
    isEmpty: sales.isEmpty && dash.rows.length === 0 && !dash.payments,
  }
}

export type PartnerOverviewView = ReturnType<typeof usePartnerOverview>
