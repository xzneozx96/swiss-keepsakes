import type { CategoryKind } from '@sk/api-contract'
import type { DataClient } from '@/features/data-client'

import { queryOptions, useQuery } from '@tanstack/react-query'
import { queryKeys, useDataClient } from '@/features/data-client'
import { fromApi } from '@/features/data-client/api-transport'

export const categoriesQueries = {
  list: (client: DataClient, storeId: string, kind: CategoryKind) =>
    queryOptions({
      ...fromApi,
      queryKey: [...queryKeys.categories.list, storeId, kind],
      queryFn: () => client.categories.list({ storeId, kind }),
    }),
}

/** One list of the store, `items` with the top level first, then sub-categories, each by position. Waits while the store id is unknown. */
export function useCategories(storeId: string | undefined, kind: CategoryKind) {
  const client = useDataClient()

  return useQuery({
    ...categoriesQueries.list(client, storeId ?? '', kind),
    enabled: storeId !== undefined,
  })
}
