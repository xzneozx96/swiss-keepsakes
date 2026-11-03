import type { QueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/features/data-client/query-keys'

const STORES = ['stores']

/**
 * What the stores feature keeps for one signed-in user: its cached reads, which hold the user's stores, members
 * and invitation previews. A sign-out, a session that ended and a different user all call this, so the next user
 * never sees the last one's stores or onboarding. The held invitation token stays: it belongs to the link, not
 * to the user.
 */
export function forgetStoresSession(queryClient: QueryClient) {
  void queryClient.cancelQueries({ queryKey: STORES })
  queryClient.removeQueries({ queryKey: STORES })
}

/**
 * A user signed in while this tab was open. The session read and the stores read were answered for nobody (or a guest), and the guest
 * site's analytics gate trusts them, so both are read again: a merchant who signs in stops being reported without a reload.
 */
export function refreshStoresSession(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.stores.sessionUser })
  void queryClient.invalidateQueries({ queryKey: queryKeys.stores.me })
}
