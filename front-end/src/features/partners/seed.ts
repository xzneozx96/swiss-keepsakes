import type { CommissionAdjustment, Partner, PartnerPayout } from './types'
import type { DemoData } from '@/features/demo/types'

import { zurichDate } from '@/features/catalog/lib/pickup'

import { allOrders, commissionItems } from './lib/ledger'

/** Invented partners for the prototype. Guide Sophie's report link is already revoked (D1). */
export const partnerSeed: Partner[] = [
  {
    id: 'hotel-am-see',
    name: 'Hotel am See',
    kind: 'hotel',
    code: 'HOTELAMSEE',
    email: 'gaeste@hotel-am-see.example',
    reportToken: 'r7Kq2mVx',
    revokedTokens: [],
  },
  {
    id: 'guide-marco',
    name: 'Guide Marco',
    kind: 'guide',
    code: 'MARCO',
    email: 'marco@lucerne-walks.example',
    reportToken: 'm4Tz8pLw',
    revokedTokens: [],
  },
  {
    id: 'guide-sophie',
    name: 'Guide Sophie',
    kind: 'guide',
    code: 'SOPHIE',
    email: 'sophie@lakeside-guiding.example',
    reportToken: null,
    revokedTokens: ['s9Hd3nQe'],
  },
]

type LedgerSource = Pick<DemoData, 'orders' | 'tours'>

const zurichMonth = (at: string) => zurichDate(new Date(at)).slice(0, 7)

/**
 * Monthly settlements before the demo start: on the 4th or 5th, the shop paid each partner
 * the commission recorded so far on transactions made in the month before, so P02 (grouped
 * by order date) shows that month as paid. October is still open, so it is owed.
 */
export function payoutSeed(data: LedgerSource): PartnerPayout[] {
  const settlements = [
    { month: '2026-08', paidOn: '2026-09-04', recordedBy: 'owner' },
    { month: '2026-09', paidOn: '2026-10-05', recordedBy: 'manager' },
  ] as const

  return partnerSeed.flatMap((partner) => {
    const items = commissionItems(
      { ...data, commissionAdjustments: [] },
      partner.id,
    )

    return settlements.flatMap(({ month, paidOn, recordedBy }) => {
      const amount = items
        .filter(
          i =>
            i.recordedAt
            && Date.parse(i.recordedAt) < Date.parse(`${paidOn}T12:00:00+02:00`)
            && zurichMonth(i.createdAt) === month,
        )
        .reduce((sum, i) => sum + i.amount, 0)

      if (amount === 0)
        return []

      return [
        {
          id: `payout-${partner.id}-${month}`,
          partnerId: partner.id,
          amount,
          method: 'bank-transfer',
          paidOn,
          reference: `Commission ${month}`,
          recordedBy,
          recordedAt: `${paidOn}T16:00:00+02:00`,
        } satisfies PartnerPayout,
      ]
    })
  })
}

/**
 * One full refund on a line of Hotel am See's largest September order, after September's
 * commission was paid (D3). It leaves an overpayment that October's commission offsets.
 */
export function adjustmentSeed(data: LedgerSource): CommissionAdjustment[] {
  const order = allOrders(data)
    .filter(
      o =>
        o.partnerId === 'hotel-am-see'
        && o.status === 'completed'
        && !!o.commissionRecordedAt
        && zurichMonth(o.createdAt) === '2026-09'
        && Date.parse(o.commissionRecordedAt)
        < Date.parse('2026-10-05T12:00:00+02:00'),
    )
    .sort(
      (a, b) =>
        b.lines[0].unitPrice * b.lines[0].quantity
        - a.lines[0].unitPrice * a.lines[0].quantity,
    )[0]

  if (!order)
    return []
  const line = order.lines[0]
  const refunded = line.unitPrice * line.quantity

  return [
    {
      id: `adjustment-${order.id}`,
      partnerId: 'hotel-am-see',
      transaction: { kind: 'order', id: order.id },
      lineId: line.id,
      refunded,
      commission: Math.round(refunded * line.commissionRate),
      reason: 'refund',
      at: '2026-10-07T15:00:00+02:00',
      recordedBy: 'owner',
    },
  ]
}
