import type { TransactionRef } from '@sk/domain/partners'
import type { CostType, CostValue } from '@sk/domain/reporting'

import { useDemoActions, useDemoSelector } from '@/features/demo'
import { demoNow } from '@/features/demo/clock'
import { transactionKey } from '@/features/partners/lib/ledger'

/** M24 save (R14, D7): Owner and Manager enter or correct a transaction's actual costs. */
export function useCostActions() {
  const { update } = useDemoActions()
  const role = useDemoSelector(s => s.role)

  return {
    canEdit: role === 'owner' || role === 'manager',
    save(
      transaction: TransactionRef,
      costs: Partial<Record<CostType, CostValue>>,
    ) {
      if (role !== 'owner' && role !== 'manager')
        return
      const updatedBy = role
      const key = transactionKey(transaction)

      update(s => ({
        ...s,
        data: {
          ...s.data,
          costs: [
            ...s.data.costs.filter(
              r => transactionKey(r.transaction) !== key,
            ),
            {
              transaction,
              costs,
              updatedBy,
              // The live demo time, not useDemoNow(): that ticks every 30 s.
              updatedAt: demoNow(s.clockStartedAt).toISOString(),
            },
          ],
        },
      }))
    },
  }
}
