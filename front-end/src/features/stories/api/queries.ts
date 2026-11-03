import type { DataClient } from '@/features/data-client'

import { queryOptions, useQuery } from '@tanstack/react-query'
import { queryKeys, useDataClient } from '@/features/data-client'
import { fromApi } from '@/features/data-client/api-transport'

export const storiesQueries = {
  list: (client: DataClient, storeId: string) =>
    queryOptions({
      ...fromApi,
      queryKey: [...queryKeys.stories.list, storeId],
      queryFn: () => client.stories.list({ storeId }),
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

/** Every story group of the store. Waits while the store id is unknown. */
export function useStories(storeId: string | undefined) {
  const client = useDataClient()

  return useQuery({ ...storiesQueries.list(client, storeId ?? ''), enabled: storeId !== undefined })
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
