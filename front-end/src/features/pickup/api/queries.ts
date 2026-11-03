import type { DataClient } from '@/features/data-client'

import { queryOptions, useQuery } from '@tanstack/react-query'
import { queryKeys, useDataClient } from '@/features/data-client'
import { fromApi } from '@/features/data-client/api-transport'

export const pickupQueries = {
  list: (client: DataClient, storeId: string, archived: boolean) =>
    queryOptions({
      ...fromApi,
      queryKey: [...queryKeys.pickup.list, storeId, archived],
      queryFn: () => client.pickup.list({ storeId, archived }),
    }),
}

/** The active or the archived pickup points of the store, by position. Waits while the store id is unknown. */
export function usePickupPlaces(storeId: string | undefined, { archived }: { archived: boolean }) {
  const client = useDataClient()

  return useQuery({
    ...pickupQueries.list(client, storeId ?? '', archived),
    enabled: storeId !== undefined,
  })
}
