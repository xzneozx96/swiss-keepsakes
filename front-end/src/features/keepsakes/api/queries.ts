import type { KeepsakeListQuery } from './client'
import type { DataClient } from '@/features/data-client'

import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query'
import { queryKeys, useDataClient } from '@/features/data-client'
import { fromApi } from '@/features/data-client/api-transport'

/** The most ids one lookup takes (the API's `MAX_LOOKUP_IDS`; the contract's runtime stays out of the main bundle). */
const MAX_LOOKUP_IDS = 50

export const keepsakesQueries = {
  // One page of the table, its filters in the key so a new filter is its own read.
  list: (client: DataClient, storeId: string, query: KeepsakeListQuery) =>
    queryOptions({
      ...fromApi,
      queryKey: [...queryKeys.keepsakes.list, storeId, query],
      queryFn: () => client.keepsakes.list({ storeId, query }),
    }),
  // The keepsakes a story references, by id: at most 50 ids, never the whole list. The key's last part is an object, so the cache edits tell it from a page.
  lookup: (client: DataClient, storeId: string, ids: string[]) =>
    queryOptions({
      ...fromApi,
      queryKey: [...queryKeys.keepsakes.list, storeId, 'lookup', { ids }],
      queryFn: () => client.keepsakes.lookup({ storeId, ids }),
    }),
  optionNames: (client: DataClient, storeId: string, exceptId?: string) =>
    queryOptions({
      ...fromApi,
      queryKey: [...queryKeys.keepsakes.list, storeId, 'option-names', { exceptId: exceptId ?? null }],
      queryFn: () => client.keepsakes.optionNames({ storeId, exceptId }),
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

/** One page of the keepsake table (or a picker's first matches). The last page stays on screen while the next one loads. Waits while the store id is unknown. */
export function useKeepsakes(storeId: string | undefined, query: KeepsakeListQuery) {
  const client = useDataClient()

  return useQuery({ ...keepsakesQueries.list(client, storeId ?? '', query), enabled: storeId !== undefined, placeholderData: keepPreviousData })
}

/** The keepsakes named by `ids` (the first 50), whatever their status. Reads nothing when `enabled` is false or there is nothing to look up. */
export function useKeepsakeLookup(storeId: string | undefined, ids: string[], enabled = true) {
  const client = useDataClient()
  // Sorted, so a reorder of the same ids is the same read; the last answer stays while a changed list loads.
  const wanted = [...new Set(ids)].slice(0, MAX_LOOKUP_IDS).sort()

  return useQuery({ ...keepsakesQueries.lookup(client, storeId ?? '', wanted), enabled: enabled && storeId !== undefined && wanted.length > 0,
    // The last answer stays only while it holds every id asked for (an id taken away), so a newly added keepsake shows loading, not "Unknown".
    placeholderData: previous => (previous && wanted.every(id => previous.items.some(item => item.id.toLowerCase() === id.toLowerCase())) ? previous : undefined) })
}

/** The option names the shop already uses, without the keepsake being edited. Waits while the store id is unknown. */
export function useOptionNamesRead(storeId: string | undefined, exceptId?: string) {
  const client = useDataClient()

  return useQuery({ ...keepsakesQueries.optionNames(client, storeId ?? '', exceptId), enabled: storeId !== undefined })
}

export function useKeepsake(storeId: string | undefined, id: string) {
  const client = useDataClient()

  return useQuery({ ...keepsakesQueries.detail(client, storeId ?? '', id), enabled: storeId !== undefined })
}
