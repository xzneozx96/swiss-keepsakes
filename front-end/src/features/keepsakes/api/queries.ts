import type { DataClient } from '@/features/data-client'

import { queryOptions, useQuery } from '@tanstack/react-query'
import { queryKeys, useDataClient } from '@/features/data-client'
import { fromApi } from '@/features/data-client/api-transport'

export const keepsakesQueries = {
  list: (client: DataClient, storeId: string) =>
    queryOptions({
      ...fromApi,
      queryKey: [...queryKeys.keepsakes.list, storeId],
      queryFn: () => client.keepsakes.list(storeId),
    }),
  // The editor's fields start from this read, so a refetch on focus must not replace what is typed.
  detail: (client: DataClient, storeId: string, id: string) =>
    queryOptions({
      ...fromApi,
      queryKey: [...queryKeys.keepsakes.detail, storeId, id],
      queryFn: () => client.keepsakes.get({ storeId, id }),
      refetchOnWindowFocus: false,
    }),
}

/** The store's keepsakes. Waits while the store id is unknown. */
export function useKeepsakes(storeId: string | undefined) {
  const client = useDataClient()

  return useQuery({ ...keepsakesQueries.list(client, storeId ?? ''), enabled: storeId !== undefined })
}

export function useKeepsake(storeId: string | undefined, id: string) {
  const client = useDataClient()

  return useQuery({ ...keepsakesQueries.detail(client, storeId ?? '', id), enabled: storeId !== undefined })
}
