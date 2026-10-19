import type { CostRecord, CostValue } from './types'
import type { DemoData } from '@/features/demo/types'
import type { Payment } from '@/features/orders/types'

import { lineTotal } from '@/features/orders/lib/selectors'
import { allOrders } from '@/features/partners/lib/ledger'

const NOT_APPLICABLE: CostValue = { notApplicable: true }

/** Provider fee on online payments: 2.9% + CHF 0.30 each, an invented demo rate. */
function paymentFee(payments: Payment[]): CostValue {
  const online = payments.filter(
    p => p.method === 'online' && p.status === 'succeeded',
  )

  if (online.length === 0)
    return NOT_APPLICABLE

  return {
    amount: online.reduce(
      (sum, p) => sum + Math.round(p.amount * 0.029) + 30,
      0,
    ),
  }
}

/** Transactions completed most recently first lose one cost each, so M24 has gaps to fill. */
const MISSING = [
  'packaging',
  'payment-fee',
  'goods',
  'other',
  'payment-fee',
] as const

/**
 * Cost data for every completed transaction before the demo start (R14), with invented
 * rates: goods at 42% of the line value, CHF 2.50 packaging per gift order, the provider
 * fee, and the guide at 30% of a tour. Pickup only, so delivery never applies.
 */
export function costSeed(
  data: Pick<DemoData, 'orders' | 'tours'>,
): CostRecord[] {
  const orders = allOrders(data)
    .filter(o => o.status === 'completed' && o.completedAt)
    .map(o => ({
      at: o.completedAt as string,
      record: {
        transaction: { kind: 'order', id: o.id },
        costs: {
          'goods': {
            amount: o.lines.reduce(
              (sum, l) => sum + Math.round(lineTotal(l) * 0.42),
              0,
            ),
          },
          'packaging': { amount: 250 },
          'payment-fee': paymentFee(o.payments),
          'delivery': NOT_APPLICABLE,
          'other': NOT_APPLICABLE,
        },
        updatedBy: o.completedBy ?? 'owner',
        updatedAt: o.completedAt as string,
      } satisfies CostRecord,
    }))
  const bookings = (data.tours?.bookings ?? [])
    .filter(b => b.status === 'completed')
    .map(b => ({
      at: b.endsAt,
      record: {
        transaction: { kind: 'booking', id: b.id },
        costs: {
          'goods': NOT_APPLICABLE,
          'packaging': NOT_APPLICABLE,
          'payment-fee': paymentFee(b.payments),
          'delivery': NOT_APPLICABLE,
          'other': { amount: Math.round(b.total * 0.3) },
        },
        updatedBy: 'owner',
        updatedAt: b.endsAt,
      } satisfies CostRecord,
    }))
  const records = [...orders, ...bookings].sort(
    (a, b) => Date.parse(b.at) - Date.parse(a.at),
  )

  MISSING.forEach((type, i) => {
    if (records[i])
      delete records[i].record.costs[type]
  })

  return records.map(r => r.record)
}
