import type { TransactionRef } from '@sk/domain/partners'
import type { CostType, CostValue } from '@sk/domain/reporting'

import { queryKeys, useCommand, useDataClient } from '@/features/data-client'
import { useDemoSelector } from '@/features/demo'

/** M24 save (R14, D7): Owner and Manager enter or correct a transaction's actual costs. */
export function useCostActions() {
  const client = useDataClient()
  const { mutate: saveCosts } = useCommand(client.reports.saveCosts, [
    queryKeys.reports.costs,
  ])
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
