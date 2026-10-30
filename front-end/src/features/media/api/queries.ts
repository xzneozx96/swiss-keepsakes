import type { MediaListQuery } from './client'
import type { DataClient } from '@/features/data-client'

import { keepPreviousData, queryOptions, useQueries, useQuery } from '@tanstack/react-query'
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
  file: (client: DataClient, storeId: string, id: string) =>
    queryOptions({
      ...fromApi,
      queryKey: [...queryKeys.media.file, storeId, id],
      queryFn: () => client.media.get({ storeId, id }),
      // A photo is "processing" for a moment after the upload.
      refetchInterval: query => (query.state.data?.status === 'processing' ? 2000 : false),
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

/** One file by id, read again every 2 s while it is processing. Waits while the store or the file is unknown. */
export function useMediaFile(storeId: string | undefined, id: string | null) {
  const client = useDataClient()

  return useQuery({ ...mediaQueries.file(client, storeId ?? '', id ?? ''), enabled: storeId !== undefined && id !== null })
}

/**
 * The names of the files, in the order of `ids`, from the same cache as `useMediaFile`, so the reads run side by side
 * and a row's picture and name cost one request. A name is `undefined` while its file loads or when the read failed.
 */
export function useMediaNames(storeId: string, ids: string[]) {
  const client = useDataClient()

  return useQueries({
    queries: ids.map(id => mediaQueries.file(client, storeId, id)),
    combine: results => results.map(result => result.data?.name),
  })
}
