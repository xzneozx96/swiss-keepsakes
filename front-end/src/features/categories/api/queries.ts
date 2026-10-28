import type { CategoryKind } from '@sk/api-contract'
import type { DataClient } from '@/features/data-client'

import { queryOptions, useQuery } from '@tanstack/react-query'
import { queryKeys, useDataClient } from '@/features/data-client'

// The demo QueryClient never refetches and never retries. This read comes from the API, where the next read
// must be a fresh one: another session may have changed the list.
const fromApi = { staleTime: 0, gcTime: 5 * 60_000, retry: false, networkMode: 'online', structuralSharing: true } as const

export const categoriesQueries = {
  list: (client: DataClient, storeId: string, kind: CategoryKind) =>
    queryOptions({
      ...fromApi,
      queryKey: [...queryKeys.categories.list, storeId, kind],
      queryFn: () => client.categories.list({ storeId, kind }),
    }),
}

/** One list of the store, `items` with the top level first, then sub-categories, each by position. */
export function useCategories(storeId: string, kind: CategoryKind) {
  return useQuery(categoriesQueries.list(useDataClient(), storeId, kind))
}
