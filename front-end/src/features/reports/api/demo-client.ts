import type { ReportsClient } from './client'
import type { DemoStore } from '@/features/demo/store'

import { demoNow } from '@/features/demo/clock'
import { updateCollection } from '@/features/demo/store'

export function createReportsDemoClient(store: DemoStore): ReportsClient {
  const data = () => store.getState().data

  return {
    costs: async () => data().costs,
    saveCosts: async ({ transaction, costs }) => {
      const { transactionKey } = await import('@/features/partners/lib/ledger')
      const key = transactionKey(transaction)

      updateCollection(store, 'costs', (records, s) => {
        if (s.role !== 'owner' && s.role !== 'manager')
          return records

        return [
          ...records.filter(r => transactionKey(r.transaction) !== key),
          {
            transaction,
            costs,
            updatedBy: s.role,
            updatedAt: demoNow(s.clockStartedAt).toISOString(),
          },
        ]
      })
    },
  }
}
