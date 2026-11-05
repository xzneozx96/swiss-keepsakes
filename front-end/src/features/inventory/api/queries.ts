import type { StockListQuery } from './client'
import type { DataClient } from '@/features/data-client'

import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query'
import { queryKeys, useDataClient } from '@/features/data-client'
import { fromApi } from '@/features/data-client/api-transport'

export const inventoryQueries = {
  // One page of the table, its tab, search and page in the key so each is its own read.
  list: (client: DataClient, storeId: string, query: StockListQuery) =>
    queryOptions({
      ...fromApi,
      queryKey: [...queryKeys.inventory.list, storeId, query],
      queryFn: () => client.inventory.list({ storeId, query }),
    }),
  detail: (client: DataClient, storeId: string, skuId: string) =>
    queryOptions({
      ...fromApi,
      queryKey: [...queryKeys.inventory.detail, storeId, skuId],
      queryFn: () => client.inventory.get({ storeId, skuId }),
    }),
}

/** One page of the store's stock per variant. The last page stays on screen while the next one loads. Waits while the store id is unknown. */
export function useInventory(storeId: string | undefined, query: StockListQuery) {
  const client = useDataClient()

  return useQuery({ ...inventoryQueries.list(client, storeId ?? '', query), enabled: storeId !== undefined, placeholderData: keepPreviousData })
}

/** One variant's stock with its reservations. Waits while the store id is unknown. */
export function useInventoryItem(storeId: string | undefined, skuId: string) {
  const client = useDataClient()

  return useQuery({ ...inventoryQueries.detail(client, storeId ?? '', skuId), enabled: storeId !== undefined })
}
