import type { Guest } from '@sk/domain/orders'
import type { DataClient } from '@/features/data-client'

import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { queryKeys, useDataClient } from '@/features/data-client'

export const accountQueries = {
  guests: (client: DataClient) =>
    queryOptions({
      queryKey: queryKeys.account.guests,
      queryFn: client.account.guests,
    }),
}

export function useGuests<T = Guest[]>(
  select?: (guests: Guest[]) => T,
): T {
  const client = useDataClient()

  return useSuspenseQuery({ ...accountQueries.guests(client), select }).data
}
