import type { Rappen } from '@sk/domain/catalog'
import type { CommissionAdjustment } from '@sk/domain/partners'
import type { CostRecord, CostType, DayRange } from '@sk/domain/reporting'
import type { ReportTx } from './transactions'

import { COST_TYPES } from '@sk/domain/reporting'

import { transactionKey } from '@/features/partners/lib/ledger'

export interface MarginPart {
  /** Completed sales in the period. */
  sales: number
  /** Of those, sales with every cost entered (R14). */
  complete: number
  /** Collected minus refunds, for the complete sales only (D8: before tax, demo assumption). */
  revenue: Rappen
  costs: Rappen
  margin: Rappen
}

export interface MarginResult {
  goods: MarginPart
  tours: MarginPart
  /** Completed sales still missing costs, newest first. */
  missing: { tx: ReportTx, types: CostType[] }[]
}

/**
 * Contribution margin (spec §4.13, R14): only completed sales whose actual costs are all
 * entered count; a missing cost is never read as 0 and nothing is estimated. The part that
 * is complete is reported as such, never scaled up to the whole period.
 */
export function margin(
  txs: ReportTx[],
  costs: CostRecord[],
  adjustments: CommissionAdjustment[],
  range: DayRange,
): MarginResult {
  const records = new Map(costs.map(r => [transactionKey(r.transaction), r]))
  const refunded = new Map<string, Rappen>()

  for (const a of adjustments) {
    const key = transactionKey(a.transaction)

    refunded.set(key, (refunded.get(key) ?? 0) + a.refunded)
  }

  const empty = (): MarginPart => ({
    sales: 0,
    complete: 0,
    revenue: 0,
    costs: 0,
    margin: 0,
  })
  const result: MarginResult = { goods: empty(), tours: empty(), missing: [] }

  for (const tx of txs) {
    if (
      tx.status !== 'completed'
      || !tx.completedDay
      || tx.completedDay < range.start
      || tx.completedDay > range.end
    ) {
      continue
    }
    const part = result[tx.kind]
    const record = records.get(tx.key)
    const missing = COST_TYPES.filter(type => !record?.costs[type])

    part.sales++
    if (missing.length) {
      result.missing.push({ tx, types: missing })
      continue
    }
    const revenue
      = tx.payments.reduce((sum, p) => sum + p.amount, 0)
        - (refunded.get(tx.key) ?? 0)
    const cost = COST_TYPES.reduce((sum, type) => {
      const value = record?.costs[type]

      return sum + (value && 'amount' in value ? value.amount : 0)
    }, 0)

    part.complete++
    part.revenue += revenue
    part.costs += cost
    part.margin += revenue - cost
  }
  result.missing.sort((a, b) =>
    (b.tx.completedDay ?? '').localeCompare(a.tx.completedDay ?? ''),
  )

  return result
}
