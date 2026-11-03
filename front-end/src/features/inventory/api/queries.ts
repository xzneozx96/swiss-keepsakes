import type { DataClient } from '@/features/data-client'

import { queryOptions, useQuery } from '@tanstack/react-query'
import { queryKeys, useDataClient } from '@/features/data-client'
import { fromApi } from '@/features/data-client/api-transport'

export const inventoryQueries = {
  list: (client: DataClient, storeId: string) =>
    queryOptions({
      ...fromApi,
      queryKey: [...queryKeys.inventory.list, storeId],
      queryFn: () => client.inventory.list(storeId),
    }),
  detail: (client: DataClient, storeId: string, skuId: string) =>
    queryOptions({
      ...fromApi,
      queryKey: [...queryKeys.inventory.detail, storeId, skuId],
      queryFn: () => client.inventory.get({ storeId, skuId }),
    }),
}

/** The store's stock per variant. Waits while the store id is unknown. */
export function useInventory(storeId: string | undefined) {
  const client = useDataClient()

  return useQuery({ ...inventoryQueries.list(client, storeId ?? ''), enabled: storeId !== undefined })
}

/** One variant's stock with its reservations. Waits while the store id is unknown. */
export function useInventoryItem(storeId: string | undefined, skuId: string) {
  const client = useDataClient()

  return useQuery({ ...inventoryQueries.detail(client, storeId ?? '', skuId), enabled: storeId !== undefined })
}
