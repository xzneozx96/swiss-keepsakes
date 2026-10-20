import type { DemoStore } from '@/features/demo/store'

import { demoGuest } from '@/features/orders/seed'
import { loadAuthClient } from './auth-api'

/**
 * Keeps the store's signed-in guest in step with the API's session cookie. It never blocks anything: the
 * app renders signed out at once and the store changes when the session answers. The client then follows
 * the session by itself (window focus, coming back online, other tabs through its broadcast, and its own
 * sign-in and sign-out), so a sign-out in another tab or a revoked or expired session clears the store.
 * Until the account feature moves to the API, any session signs in the demo guest.
 */
export function followSession(store: DemoStore) {
  loadAuthClient()
    .then((client) => {
      client.useSession.subscribe(({ data, isPending }) => {
        if (isPending)
          return
        const guestId = data ? demoGuest.id : null

        if (store.getState().data.signedInGuestId !== guestId) {
          store.update(s => ({
            ...s,
            data: { ...s.data, signedInGuestId: guestId },
          }))
        }
      })
    })
    .catch((error: unknown) => {
      console.error('The session could not be followed', error)
    })
}
