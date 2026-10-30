import type { MediaListQuery } from './client'
import type { DataClient } from '@/features/data-client'

import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query'
import { queryKeys, useDataClient } from '@/features/data-client'
import { fromApi } from '@/features/data-client/api-transport'

/** While a file is being built the list reads again, so the tile turns Ready without a reload. */
const PROCESSING_POLL_MS = 1500

export const mediaQueries = {
  list: (client: DataClient, storeId: string, query: MediaListQuery) =>
    queryOptions({
      ...fromApi,
      queryKey: [...queryKeys.media.list, storeId, query],
      queryFn: () => client.media.list({ storeId, query }),
      refetchInterval: ({ state }) => (state.data?.items.some(item => item.status === 'processing') ? PROCESSING_POLL_MS : false),
    }),
  uses: (client: DataClient, storeId: string, id: string) =>
    queryOptions({
      ...fromApi,
      queryKey: [...queryKeys.media.uses, storeId, id],
      queryFn: () => client.media.uses({ storeId, id }),
    }),
}

/** One page of the library. The last page stays on screen while the next one loads, so the wall does not flash. */
export function useMediaList(storeId: string, query: MediaListQuery) {
  const client = useDataClient()

  return useQuery({ ...mediaQueries.list(client, storeId, query), placeholderData: keepPreviousData })
}

export function useMediaUses(storeId: string, id: string) {
  const client = useDataClient()

  return useQuery(mediaQueries.uses(client, storeId, id))
}
