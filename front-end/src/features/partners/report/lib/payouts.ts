import type { Rappen } from '@sk/domain/catalog'
import type { DateRange } from './report'
import type { QueriedData } from '@/features/demo/types'
import type { LedgerEntry } from '@/features/partners/lib/ledger'

import { zurichDate } from '@sk/domain/catalog'
import { partnerLedger } from '@/features/partners/lib/ledger'

/** Payouts, refund adjustments and offsets in one P02 period (step 5.7, AC13, D16). */
export interface PeriodMoney {
  /** Paid out to the partner during the period. */
  paid: Rappen
  payouts: number
  /** Commission removed by refunds recorded during the period. */
  adjusted: Rappen
  /** Overpayment applied to commission recorded during the period. */
  offset: Rappen
  /** Overpayment still to offset when the period started, carried from before. */
  carriedIn: Rappen
  /** Balances at the end of the period, or now for the running period. */
  toPay: Rappen
  toOffset: Rappen
  /** The period's payouts, refund adjustments and offsets, oldest first. */
  entries: Exclude<LedgerEntry, { type: 'recorded' }>[]
  /** All time, for the all-time card. */
  allTime: { paid: Rappen, toPay: Rappen, toOffset: Rappen }
}

/**
 * Reads one period out of the partner's ledger (the same ledger as M15 and M16, so the
 * numbers match). Days are Zurich days, as the rest of P02.
 */
export function periodMoney(
  data: Pick<
    QueriedData,
    'orders' | 'tours' | 'commissionAdjustments' | 'partnerPayouts'
  >,
  partnerId: string,
  range: DateRange,
  now: Date,
): PeriodMoney {
  const ledger = partnerLedger(data, partnerId, now)
  const day = (e: LedgerEntry) => zurichDate(new Date(e.at))
  const before = ledger.entries.filter(e => day(e) < range.start)
  const through = ledger.entries.filter(e => day(e) <= range.end)
  const inRange = through.filter(e => day(e) >= range.start)
  const last = (list: LedgerEntry[]) => list.at(-1)
  const entries = inRange.filter(
    (e): e is Exclude<LedgerEntry, { type: 'recorded' }> =>
      e.type !== 'recorded',
  )
  const sum = (type: 'payout' | 'adjustment' | 'offset') =>
    entries.reduce(
      (total, e) =>
        total
        + (e.type !== type
          ? 0
          : e.type === 'payout'
            ? e.payout.amount
            : e.type === 'adjustment'
              ? e.adjustment.commission
              : e.amount),
      0,
    )

  return {
    paid: sum('payout'),
    payouts: entries.filter(e => e.type === 'payout').length,
    adjusted: sum('adjustment'),
    offset: sum('offset'),
    carriedIn: last(before)?.toOffset ?? 0,
    toPay: last(through)?.toPay ?? 0,
    toOffset: last(through)?.toOffset ?? 0,
    entries,
    allTime: {
      paid: ledger.paid,
      toPay: ledger.toPay,
      toOffset: ledger.toOffset,
    },
  }
}
