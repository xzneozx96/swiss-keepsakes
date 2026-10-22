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
