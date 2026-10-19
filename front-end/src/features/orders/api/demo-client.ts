import type { OrdersClient } from './client'
import type { DemoStore } from '@/features/demo/store'

import { demoNow } from '@/features/demo/clock'

export function createOrdersDemoClient(store: DemoStore): OrdersClient {
  const data = () => store.getState().data

  return {
    orders: async () => data().orders,
    submitCart: async ({ language }) => {
      const { buildOrderDrafts, createOrdersFromCart } = await import(
        '@/features/checkout/lib/create-orders',
      )
      let ids: string[] = []

      store.update((s) => {
        const ctx = {
          now: demoNow(s.clockStartedAt),
          language,
          staffLanguage: language,
        }
        const next = createOrdersFromCart(s, ctx)

        ids = next === s ? [] : buildOrderDrafts(s.data, ctx).map(o => o.id)

        return next
      })

      return ids
    },
  }
}
