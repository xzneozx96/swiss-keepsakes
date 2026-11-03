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
}

/** Every story group of the store. Waits while the store id is unknown. */
export function useStories(storeId: string | undefined) {
  const client = useDataClient()

  return useQuery({ ...storiesQueries.list(client, storeId ?? ''), enabled: storeId !== undefined })
}
