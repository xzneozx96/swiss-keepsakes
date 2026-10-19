import type { CostRecord } from '@sk/domain/reporting'

/** Cost records per transaction (M24). */
export interface ReportsClient {
  costs: () => Promise<CostRecord[]>
}
