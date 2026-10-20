import type { Rappen } from '@sk/domain/catalog'
import type { TripRecord } from '@sk/domain/orders'
import type { TransactionRef } from '@sk/domain/partners'
import type { QueriedData } from '@/features/demo/types'

import { bookingCommission } from '@sk/domain/bookings'
import { zurichDayOf } from '@sk/domain/catalog'
import { commission, lineTotal } from '@sk/domain/orders'
import { prng } from '@/features/merchant/today/lib/demo-history'
import { allOrders, transactionKey } from '@/features/partners/lib/ledger'

/** The four guest groups of PRD §3, plus "not determined" when the trip answers are missing. */
export const GUEST_GROUPS = [
  'group-day',
  'group-multi',
  'independent-multi',
  'independent-day',
  'unknown',
] as const
export type GuestGroup = (typeof GUEST_GROUPS)[number]

export type TxStatus = 'open' | 'completed' | 'lost' | 'no-show'

export interface ReportLine {
  /** Product or tour id, for the product filter and the best-seller list. */
  itemId: string
  kind: 'goods' | 'tours'
  quantity: number
  value: Rappen
}

/** One order or tour booking, normalised for M21 (spec §4.13). */
export interface ReportTx {
  key: string
  transaction: TransactionRef
  kind: 'goods' | 'tours'
  ref: string
  /** Zurich day it was placed, YYYY-MM-DD. */
  day: string
  partnerId: string | null
  group: GuestGroup
  status: TxStatus
  /** Booking value; 0 for declined, cancelled and expired holds. */
  value: Rappen
  /** Succeeded payments, each on its own Zurich day. */
  payments: { day: string, amount: Rappen }[]
  /** Still owed on an open transaction. */
  outstanding: Rappen
  /** Commission at the rate of booking, and the day it was recorded (AC10). */
  commission: Rappen
  commissionDay: string | null
  /** The day it completed, for the margin (R14). */
  completedDay: string | null
  lines: ReportLine[]
}

/** PRD §3.1: group or independent, and one day or several at the place; else not determined. */
export function guestGroup(trip?: TripRecord): GuestGroup {
  if (!trip?.travelStyle || !trip.arriveOn || !trip.leaveOn)
    return 'unknown'
  const days = trip.arriveOn === trip.leaveOn ? 'day' : 'multi'

  return `${trip.travelStyle === 'group' ? 'group' : 'independent'}-${days}` as GuestGroup
}

/**
 * The generated history has no trip answers, so the guest-group views would be empty. Each
 * history order gets a stable made-up answer from its id (about a third stay unanswered,
 * as real guests skip the optional questions). Never stored; demo data only.
 */
function historyGroup(id: string): GuestGroup {
  let seed = 0

  for (const ch of id) seed = (seed * 31 + ch.charCodeAt(0)) | 0
  const r = prng(seed)()

  return r < 0.22
    ? 'group-day'
    : r < 0.36
      ? 'group-multi'
      : r < 0.52
        ? 'independent-multi'
        : r < 0.66
          ? 'independent-day'
          : 'unknown'
}

function succeeded(payments: { status: string, amount: Rappen, at: string }[]) {
  return payments
    .filter(p => p.status === 'succeeded')
    .map(p => ({ day: zurichDayOf(p.at), amount: p.amount }))
}

/** Orders (with the generated history, D14) and tour bookings that became bookings. */
export function reportTransactions(
  data: Pick<QueriedData, 'orders' | 'tours'>,
): ReportTx[] {
  const history = new Set(
    allOrders(data)
      .filter(o => o.ref.startsWith('SK-H'))
      .map(o => o.id),
  )
  const orders: ReportTx[] = allOrders(data).map((o) => {
    const lost = o.status === 'declined' || o.status === 'cancelled'
    const lines = o.lines.map(l => ({
      itemId: l.productId,
      kind: 'goods' as const,
      quantity: l.quantity,
      value: lineTotal(l),
    }))
    const total = lines.reduce((sum, l) => sum + l.value, 0)
    const payments = succeeded(o.payments)
    const paid = payments.reduce((sum, p) => sum + p.amount, 0)
    const c = commission(o)

    return {
      key: transactionKey({ kind: 'order', id: o.id }),
      transaction: { kind: 'order', id: o.id },
      kind: 'goods',
      ref: o.ref,
      day: zurichDayOf(o.createdAt),
      partnerId: o.partnerId,
      group: history.has(o.id) ? historyGroup(o.id) : guestGroup(o.trip),
      status: lost ? 'lost' : o.status === 'completed' ? 'completed' : 'open',
      value: lost ? 0 : total,
      payments,
      outstanding:
        lost || o.status === 'completed' ? 0 : Math.max(0, total - paid),
      commission: c.state === 'recorded' ? c.total : 0,
      commissionDay: o.commissionRecordedAt
        ? zurichDayOf(o.commissionRecordedAt)
        : null,
      completedDay: o.completedAt ? zurichDayOf(o.completedAt) : null,
      lines,
    }
  })
  const bookings: ReportTx[] = (data.tours?.bookings ?? [])
    .filter(b => b.status !== 'pending_payment' && b.status !== 'expired')
    .map((b) => {
      const lost = b.status === 'cancelled'
      const payments = succeeded(b.payments)
      const paid = payments.reduce((sum, p) => sum + p.amount, 0)
      const c = bookingCommission(b)

      return {
        key: transactionKey({ kind: 'booking', id: b.id }),
        transaction: { kind: 'booking', id: b.id },
        kind: 'tours',
        ref: b.ref,
        day: zurichDayOf(b.createdAt),
        partnerId: b.partnerId,
        group: guestGroup(b.trip),
        status: lost
          ? 'lost'
          : b.status === 'no_show'
            ? 'no-show'
            : b.status === 'completed'
              ? 'completed'
              : 'open',
        value: lost ? 0 : b.total,
        payments,
        outstanding:
          lost || b.status === 'completed' || b.status === 'no_show'
            ? 0
            : Math.max(0, b.total - paid),
        commission: c.state === 'recorded' ? c.amount : 0,
        commissionDay: b.commissionRecordedAt
          ? zurichDayOf(b.commissionRecordedAt)
          : null,
        completedDay: b.status === 'completed' ? zurichDayOf(b.endsAt) : null,
        lines: [
          {
            itemId: b.tourId,
            kind: 'tours',
            quantity: b.adults + b.children + b.infants,
            value: b.total,
          },
        ],
      }
    })

  return [...orders, ...bookings]
}
