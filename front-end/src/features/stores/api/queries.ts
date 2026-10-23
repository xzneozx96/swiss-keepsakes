import type { DataClient } from '@/features/data-client'

import { infiniteQueryOptions, queryOptions, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { queryKeys, useDataClient } from '@/features/data-client'

// The demo QueryClient never refetches and never retries, which suits browser-held data. These reads
// come from the API, where the next read must be a fresh one: another session may have changed the store.
const fromApi = { staleTime: 0, gcTime: 5 * 60_000, retry: false, networkMode: 'online', structuralSharing: true } as const

export const storesQueries = {
  adminStores: (client: DataClient) =>
    infiniteQueryOptions({
      ...fromApi,
      queryKey: queryKeys.stores.adminStores,
      queryFn: ({ pageParam }) => client.stores.adminStores(pageParam),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: page => page.nextCursor ?? undefined,
    }),
  me: (client: DataClient) =>
    queryOptions({
      ...fromApi,
      queryKey: queryKeys.stores.me,
      queryFn: () => client.stores.me(),
    }),
  members: (client: DataClient, storeId: string) =>
    queryOptions({
      ...fromApi,
      queryKey: [...queryKeys.stores.members, storeId],
      queryFn: () => client.stores.members(storeId),
    }),
  // The token is in the key and nowhere else: queries live in memory, and a sign-out removes them.
  invitationPreview: (client: DataClient, token: string) =>
    queryOptions({
      ...fromApi,
      queryKey: [...queryKeys.stores.invitationPreview, token],
      queryFn: () => client.stores.previewInvitation(token),
    }),
  onboarding: (client: DataClient, storeId: string) =>
    queryOptions({
      ...fromApi,
      queryKey: [...queryKeys.stores.onboarding, storeId],
      queryFn: () => client.stores.onboarding(storeId),
    }),
}

/** A01's pages. The screen shows the error inline, because its 401 and 403 mean sign in and not found. */
export function useAdminStores() {
  return useInfiniteQuery(storesQueries.adminStores(useDataClient()))
}

export function useOnboarding(storeId: string | undefined) {
  const client = useDataClient()

  return useQuery({
    ...storesQueries.onboarding(client, storeId ?? ''),
    enabled: storeId !== undefined,
  })
}

/** The signed-in user's stores. `enabled: false` leaves it alone until a screen needs it. */
export function useMe(enabled = true) {
  return useQuery({ ...storesQueries.me(useDataClient()), enabled })
}

/** M22's list. The API answers 403 to a Manager, which is the real guard. */
export function useMembers(storeId: string) {
  return useQuery(storesQueries.members(useDataClient(), storeId))
}

export function useInvitationPreview(token: string | undefined) {
  const client = useDataClient()

  return useQuery({
    ...storesQueries.invitationPreview(client, token ?? ''),
    enabled: token !== undefined,
  })
}
