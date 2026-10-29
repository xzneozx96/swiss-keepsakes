import type { TransactionRef } from '@sk/domain/partners'
import type { CostType, CostValue } from '@sk/domain/reporting'

import { COST_TYPES } from '@sk/domain/reporting'
import { useLocale } from '@/contexts/locale-context'
import { useCommand } from '@/features/data-client'
import { useDemoSelector } from '@/features/demo'

/**
 * M24 save (R14, D7): Owner and Manager enter or correct a transaction's actual costs. `ref` is the
 * transaction's own reference, for the saved toast; `costs` omits a type exactly when it is still
 * missing (`CostSheet`'s `missing`), so the toast tells the merchant whether anything is left.
 */
export function useCostActions(ref: string) {
  const { t } = useLocale()
  const { mutate: saveCosts } = useCommand('reports', 'saveCosts', {
    meta: {
      success: (_result, input) => {
        const missingCount = COST_TYPES.length - Object.keys(input.costs).length

        return missingCount
          ? t(missingCount === 1 ? 'costData.saved.missingOne' : 'costData.saved.missingOther', { ref, count: missingCount })
          : t('costData.saved.complete', { ref })
      },
    },
  })
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
