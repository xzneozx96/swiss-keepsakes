import type { StoryListQuery } from './client'
import type { DataClient } from '@/features/data-client'

import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query'
import { queryKeys, readAllNumberedPages, useDataClient, WHOLE_LIST_PAGE_SIZE } from '@/features/data-client'
import { fromApi } from '@/features/data-client/api-transport'

export const storiesQueries = {
  // One page of the table, its filters in the key so a new filter is its own read.
  list: (client: DataClient, storeId: string, query: StoryListQuery) =>
    queryOptions({
      ...fromApi,
      queryKey: [...queryKeys.stories.list, storeId, query],
      queryFn: () => client.stories.list({ storeId, query }),
    }),
  // Every story, page after page, for the screens that look stories up by id (debt: ADR-033 slice 4).
  all: (client: DataClient, storeId: string) =>
    queryOptions({
      ...fromApi,
      queryKey: [...queryKeys.stories.list, storeId, 'all'],
      queryFn: async () => ({ items: await readAllNumberedPages(page => client.stories.list({ storeId, query: { page, pageSize: WHOLE_LIST_PAGE_SIZE } }), 'stories') }),
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

/** Every story group of the store, for a screen that looks stories up by id. Waits while the store id is unknown. */
export function useAllStories(storeId: string | undefined) {
  const client = useDataClient()

  return useQuery({ ...storiesQueries.all(client, storeId ?? ''), enabled: storeId !== undefined })
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
