import type { TransactionRef } from '@sk/domain/partners'
import type { CostRecord, CostType, CostValue } from '@sk/domain/reporting'

/** Cost records per transaction (M24). */
export interface ReportsClient {
  costs: () => Promise<CostRecord[]>
  /** The signed-in Owner or Manager enters or corrects one transaction's actual costs (R14, D7). */
  saveCosts: (input: {
    transaction: TransactionRef
    costs: Partial<Record<CostType, CostValue>>
  }) => Promise<void>
}
