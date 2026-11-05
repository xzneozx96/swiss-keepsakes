import type { StoryListQuery } from './client'
import type { DataClient } from '@/features/data-client'

import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query'
import { queryKeys, useDataClient } from '@/features/data-client'
import { fromApi } from '@/features/data-client/api-transport'

/** The most ids one lookup takes (the API's `MAX_LOOKUP_IDS`; the contract's runtime stays out of the main bundle). */
const MAX_LOOKUP_IDS = 50

export const storiesQueries = {
  // One page of the table, its filters in the key so a new filter is its own read.
  list: (client: DataClient, storeId: string, query: StoryListQuery) =>
    queryOptions({
      ...fromApi,
      queryKey: [...queryKeys.stories.list, storeId, query],
      queryFn: () => client.stories.list({ storeId, query }),
    }),
  // The stories a story references, by id: at most 50 ids, never the whole list.
  lookup: (client: DataClient, storeId: string, ids: string[]) =>
    queryOptions({
      ...fromApi,
      queryKey: [...queryKeys.stories.list, storeId, 'lookup', ids],
      queryFn: () => client.stories.lookup({ storeId, ids }),
    }),
  // A form starts from the read and keeps its own copy, so a refocus must not refetch it.
  group: (client: DataClient, storeId: string, groupId: string) =>
    queryOptions({
      ...fromApi,
      queryKey: [...queryKeys.stories.group, storeId, groupId],
      queryFn: () => client.stories.group({ storeId, groupId }),
      refetchOnWindowFocus: false,
    }),
  // The Delete story confirm names what the answer says, so it is read again each time the dialog opens.
  links: (client: DataClient, storeId: string, groupId: string) =>
    queryOptions({
      ...fromApi,
      queryKey: [...queryKeys.stories.links, storeId, groupId],
      queryFn: () => client.stories.links({ storeId, groupId }),
    }),
}

/** One page of the stories table. The last page stays on screen while the next one loads. Waits while the store id is unknown. */
export function useStories(storeId: string | undefined, query: StoryListQuery) {
  const client = useDataClient()

  return useQuery({ ...storiesQueries.list(client, storeId ?? '', query), enabled: storeId !== undefined, placeholderData: keepPreviousData })
}

/** The story groups named by `ids` (the first 50). Reads nothing when `enabled` is false or `ids` is empty. */
export function useStoryLookup(storeId: string | undefined, ids: string[], enabled = true) {
  const client = useDataClient()
  // Sorted, so a reorder of the same ids is the same read; the last answer stays while a changed list loads.
  const wanted = [...new Set(ids)].slice(0, MAX_LOOKUP_IDS).sort()

  return useQuery({ ...storiesQueries.lookup(client, storeId ?? '', wanted), enabled: enabled && storeId !== undefined && wanted.length > 0, placeholderData: keepPreviousData })
}

/** What links to a story (the Delete story confirm). Waits while the store id is unknown. */
export function useStoryLinks(storeId: string | undefined, groupId: string) {
  const client = useDataClient()

  return useQuery({ ...storiesQueries.links(client, storeId ?? '', groupId), enabled: storeId !== undefined })
}

/** One story group with both versions. Waits while the store id is unknown. */
export function useStoryGroup(storeId: string | undefined, groupId: string) {
  const client = useDataClient()

  return useQuery({ ...storiesQueries.group(client, storeId ?? '', groupId), enabled: storeId !== undefined })
}
