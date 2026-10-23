import type { QueryClient } from '@tanstack/react-query'

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
