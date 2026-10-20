import type { TourRecords } from '@sk/domain/bookings'
import type { DataClient } from '@/features/data-client'

import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { queryKeys, useDataClient } from '@/features/data-client'

export const toursQueries = {
  records: (client: DataClient) =>
    queryOptions({
      queryKey: queryKeys.tours.records,
      queryFn: client.tours.records,
    }),
}

export function useTourRecords<T = TourRecords>(
  select?: (records: TourRecords) => T,
): T {
  const client = useDataClient()

  return useSuspenseQuery({ ...toursQueries.records(client), select }).data
}
