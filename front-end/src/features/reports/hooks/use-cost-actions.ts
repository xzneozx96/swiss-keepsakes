import type { TransactionRef } from '@sk/domain/partners'
import type { CostType, CostValue } from '@sk/domain/reporting'

import { useCommand } from '@/features/data-client'
import { useDemoSelector } from '@/features/demo'

/** M24 save (R14, D7): Owner and Manager enter or correct a transaction's actual costs. */
export function useCostActions() {
  const { mutate: saveCosts } = useCommand('reports', 'saveCosts')
  const role = useDemoSelector(s => s.role)

  return {
    canEdit: role === 'owner' || role === 'manager',
    save(
      transaction: TransactionRef,
      costs: Partial<Record<CostType, CostValue>>,
    ) {
      if (role !== 'owner' && role !== 'manager')
        return
      saveCosts({ transaction, costs })
    },
  }
}
