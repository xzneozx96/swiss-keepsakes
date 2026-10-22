import type { QueryClient } from '@tanstack/react-query'
import type { DemoStore } from '@/features/demo/store'

import { clearGuestData } from '@/features/demo/store'
import { demoGuest } from '@/features/orders/seed'
import { forgetStoresSession } from '@/features/stores/lib/forget-session'
import { loadAuthClient } from './auth-api'

/**
 * Keeps the store's signed-in guest in step with the API's session cookie. It never blocks anything: the
 * app renders signed out at once and the store changes when the session answers. The client then follows
 * the session by itself (window focus, coming back online, other tabs through its broadcast, and its own
 * sign-in and sign-out), so a sign-out in another tab or a revoked or expired session clears the store.
 * When the session is gone, the account data of the demo guest goes with it (`clearGuestData`), but only when the guest was signed in in this tab. Until the account feature moves to the API, any session signs in the demo guest.
 * The stores feature's cached reads and remembered store go when the session ends or another user takes it over
 * in this tab: this is the one place that sees both.
 */
export function followSession(store: DemoStore, queryClient: QueryClient) {
  let userId: string | undefined

  loadAuthClient()
    .then((client) => {
      client.useSession.subscribe(({ data, isPending }) => {
        if (isPending)
          return
        const wasSignedIn = store.getState().data.signedInGuestId !== null

        if (data) {
          const next = data.user.id

          if (userId !== undefined && userId !== next)
            forgetStoresSession(queryClient)
          userId = next
          if (store.getState().data.signedInGuestId !== demoGuest.id) {
            store.update(s => ({
              ...s,
              data: { ...s.data, signedInGuestId: demoGuest.id },
            }))
          }

          return
        }
        if (userId !== undefined) {
          forgetStoresSession(queryClient)
          userId = undefined
        }
        // No session. A guest who was signed in here loses everything of the account, the cart included. A browser
        // that finds no session at start is left alone: its saved data may be only a cart, and writing the store
        // at a random moment after the first paint would re-render the screen the guest is using.
        if (wasSignedIn)
          store.update(s => clearGuestData(s))
      })
    })
    .catch((error: unknown) => {
      console.error('The session could not be followed', error)
    })
}
