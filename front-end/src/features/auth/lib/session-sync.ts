import type { DemoStore } from '@/features/demo/store'

import { clearGuestData } from '@/features/demo/store'
import { demoGuest } from '@/features/orders/seed'
import { loadAuthClient } from './auth-api'

/**
 * Keeps the store's signed-in guest in step with the API's session cookie. It never blocks anything: the
 * app renders signed out at once and the store changes when the session answers. The client then follows
 * the session by itself (window focus, coming back online, other tabs through its broadcast, and its own
 * sign-in and sign-out), so a sign-out in another tab or a revoked or expired session clears the store.
 * When the session is gone, the account data of the demo guest goes with it (`clearGuestData`). Until the account feature moves to the API, any session signs in the demo guest.
 */
export function followSession(store: DemoStore) {
  // The session answers null again on every refetch, but the account data is cleared once per sign-out.
  let cleared = false

  loadAuthClient()
    .then((client) => {
      client.useSession.subscribe(({ data, isPending }) => {
        if (isPending)
          return
        const wasSignedIn = store.getState().data.signedInGuestId !== null

        if (data) {
          cleared = false
          if (store.getState().data.signedInGuestId !== demoGuest.id) {
            store.update(s => ({
              ...s,
              data: { ...s.data, signedInGuestId: demoGuest.id },
            }))
          }

          return
        }
        // No session. A guest who was signed in here loses everything of the account, the cart included. At
        // start, what an earlier session left in this browser goes too, but the cart and saved gifts stay.
        if (cleared && !wasSignedIn)
          return
        cleared = true
        store.update(s => clearGuestData(s, wasSignedIn))
      })
    })
    .catch((error: unknown) => {
      console.error('The session could not be followed', error)
    })
}
