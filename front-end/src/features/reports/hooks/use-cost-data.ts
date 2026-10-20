import type { TransactionRef } from '@sk/domain/partners'
import type { CostRecord, CostType, CostValue } from '@sk/domain/reporting'
import type { CostFilter } from '../lib/search-params'

import type { StatusTone } from '@/components/status-chip'
import { zurichDayOf } from '@sk/domain/catalog'

import { formatOrderDate, orderTotal } from '@sk/domain/orders'
import { COST_TYPES, mondayOf } from '@sk/domain/reporting'
import { calendarDay, dateTimeFormat, formatMoney, pickText } from '@sk/domain/shared'
import { useLocale } from '@/contexts/locale-context'
import { useGuests } from '@/features/account/api/queries'
import { useProducts } from '@/features/catalog/api/queries'
import { useDemoNow } from '@/features/demo'
import { useOrders } from '@/features/orders/api/queries'
import { allOrders, transactionKey } from '@/features/partners/lib/ledger'
import { useCosts } from '@/features/reports/api/queries'
import { useTourRecords } from '@/features/tours/api/queries'
import { COST_FILTERS } from '../lib/search-params'

/** Weeks in the completeness chart, ending with the running week. */
const CHART_WEEKS = 8

export interface CostRow {
  key: string
  transaction: TransactionRef
  ref: string
  /** Opens M04 or M07. */
  href: string
  /** The product (first line) or the tour: name and photo, as on the M03 cards. */
  title: string
  /** "+1 more" when an order has more lines; "" otherwise. */
  more: string
  photo?: string
  guest: string
  /** Completion day, "12.10.2026". */
  date: string
  /** Monday of the completion week, YYYY-MM-DD. */
  week: string
  /** "Kapellbrücke pocket knife · 12.10.2026", the cost sheet's header. */
  meta: string
  value: string
  missing: CostType[]
  state: { text: string, tone: StatusTone }
  costs: Partial<Record<CostType, CostValue>>
}

export interface CostWeek {
  /** Monday, YYYY-MM-DD. */
  week: string
  /** "5 Oct" */
  label: string
  complete: number
  missing: number
}

/** A transaction's cost data is complete when every cost type is an amount or confirmed 0 (R14). */
export function missingCosts(record?: CostRecord): CostType[] {
  return COST_TYPES.filter(type => !record?.costs[type])
}

function addDays(iso: string, days: number) {
  const d = calendarDay(iso)

  d.setUTCDate(d.getUTCDate() + days)

  return d.toISOString().slice(0, 10)
}

/**
 * M24 Cost data (spec §4.13, R14): every completed order and tour booking with the actual
 * costs entered for it. An empty cost is missing, never 0; "does not apply" is entered as
 * such. Newest first. `week` (a Monday) narrows the list to one bar of the chart.
 */
export function useCostData(filter: CostFilter, week: string | null) {
  const { t, language, intlLocale } = useLocale()
  const costs = useCosts()
  const storedProducts = useProducts()
  const tourRecords = useTourRecords()
  const guests = useGuests()
  const storedOrders = useOrders()
  const now = useDemoNow()
  const money = (rappen: number) => formatMoney(rappen / 100, intlLocale)
  const records = new Map(costs.map(r => [transactionKey(r.transaction), r]))
  const products = new Map(storedProducts.map(p => [p.id, p]))
  const tours = new Map(tourRecords.tours.map(x => [x.id, x]))
  const guestName = (id: string) =>
    guests.find(g => g.id === id)?.name ?? ''

  const orders = allOrders({ orders: storedOrders })
    .filter(o => o.status === 'completed' && o.completedAt)
    .map(o => ({
      transaction: { kind: 'order' as const, id: o.id },
      ref: o.ref,
      href: `#/store/orders/${o.id}`,
      at: o.completedAt as string,
      title: pickText(o.lines[0].productName, language).text,
      more:
        o.lines.length > 1
          ? t('costData.more', { count: o.lines.length - 1 })
          : '',
      photo: products.get(o.lines[0].productId)?.photo,
      guest: guestName(o.guestId),
      total: orderTotal(o),
    }))
  const bookings = tourRecords.bookings
    .filter(b => b.status === 'completed')
    .map(b => ({
      transaction: { kind: 'booking' as const, id: b.id },
      ref: b.ref,
      href: `#/store/bookings/${b.id}`,
      at: b.endsAt,
      title: pickText(b.tourName, language).text,
      more: '',
      photo: tours.get(b.tourId)?.photos[0],
      guest: guestName(b.guestId) || b.contactName,
      total: b.total,
    }))

  const all: CostRow[] = [...orders, ...bookings]
    .filter(x => Date.parse(x.at) <= now.getTime() + 60_000)
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .map((x) => {
      const key = transactionKey(x.transaction)
      const record = records.get(key)
      const missing = missingCosts(record)
      const day = zurichDayOf(x.at)
      const date = formatOrderDate(day, intlLocale)

      return {
        key,
        transaction: x.transaction,
        ref: x.ref,
        href: x.href,
        title: x.title,
        more: x.more,
        photo: x.photo,
        guest: x.guest,
        date,
        week: mondayOf(day),
        meta: `${x.title} · ${date}`,
        value: money(x.total),
        missing,
        state: missing.length
          ? {
              text: t(
                missing.length === 1
                  ? 'costData.state.missingOne'
                  : 'costData.state.missingOther',
                { count: missing.length },
              ),
              tone: 'warning',
            }
          : { text: t('costData.state.complete'), tone: 'success' },
        costs: record?.costs ?? {},
      }
    })

  const thisWeek = mondayOf(zurichDayOf(now.toISOString()))
  const weekLabel = (monday: string) =>
    dateTimeFormat(intlLocale, {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    }).format(calendarDay(monday))
  const weeks: CostWeek[] = Array.from({ length: CHART_WEEKS }, (_, i) => {
    const monday = addDays(thisWeek, -7 * (CHART_WEEKS - 1 - i))
    const inWeek = all.filter(row => row.week === monday)

    return {
      week: monday,
      label: weekLabel(monday),
      complete: inWeek.filter(row => row.missing.length === 0).length,
      missing: inWeek.filter(row => row.missing.length > 0).length,
    }
  })

  const scoped = week ? all.filter(row => row.week === week) : all
  const inFilter = (row: CostRow, f: CostFilter) =>
    f === 'all' || (f === 'missing') === (row.missing.length > 0)

  return {
    rows: scoped.filter(row => inFilter(row, filter)),
    filters: COST_FILTERS.map(id => ({
      id,
      label: t(`costData.filter.${id}`),
      count: scoped.filter(row => inFilter(row, id)).length,
    })),
    weeks,
    weekLabel: week ? weekLabel(week) : null,
    complete: all.filter(row => row.missing.length === 0).length,
    total: all.length,
  }
}
