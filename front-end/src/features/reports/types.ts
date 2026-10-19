import type { Rappen } from '@/features/catalog/types'
import type { StaffId } from '@/features/orders/types'
import type { TransactionRef } from '@/features/partners/types'

/** The variable costs M24 asks for on every transaction (spec §4.13, R14). */
export const COST_TYPES = [
  'goods',
  'packaging',
  'payment-fee',
  'delivery',
  'other',
] as const

export type CostType = (typeof COST_TYPES)[number]

/** An actual amount, or confirmed as not applying (0). A missing type means no data yet. */
export type CostValue = { amount: Rappen } | { notApplicable: true }

/** The cost data entered for one transaction in M24. */
export interface CostRecord {
  transaction: TransactionRef
  costs: Partial<Record<CostType, CostValue>>
  updatedBy: StaffId
  updatedAt: string
}
