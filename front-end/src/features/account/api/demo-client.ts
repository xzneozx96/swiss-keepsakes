import type { AccountClient } from './client'
import type { DemoStore } from '@/features/demo/store'

import { demoNow } from '@/features/demo/clock'
import { updateCollection } from '@/features/demo/store'

export function createAccountDemoClient(store: DemoStore): AccountClient {
  const data = () => store.getState().data

  return {
    guests: async () => data().guests,
    updateProfile: async (patch) => {
      updateCollection(store, 'guests', (guests, s) =>
        guests.map(g =>
          g.id === s.data.signedInGuestId ? { ...g, ...patch } : g,
        ))
    },
    saveTrip: async ({ target, answers }) => {
      const { withTrip } = await import('@/features/checkout/lib/trip')

      store.update((s) => {
        const guestId = s.data.signedInGuestId
        const at = demoNow(s.clockStartedAt).toISOString()

        return guestId
          ? {
              ...s,
              data: withTrip(
                s.data,
                guestId,
                target,
                answers ? { ...answers, answeredAt: at } : { skippedAt: at },
              ),
            }
          : s
      })
    },
  }
}
