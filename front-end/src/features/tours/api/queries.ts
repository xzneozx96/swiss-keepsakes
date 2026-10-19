import type { TourData } from '@sk/domain/bookings'
import type { DataClient } from '@/features/data-client'

import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { queryKeys, useDataClient } from '@/features/data-client'

export const toursQueries = {
  tourData: (client: DataClient) =>
    queryOptions({
      queryKey: queryKeys.tours.tourData,
      queryFn: client.tours.tourData,
    }),
}

export function useTourData<T = TourData>(select?: (data: TourData) => T): T {
  const client = useDataClient()

  return useSuspenseQuery({ ...toursQueries.tourData(client), select }).data
}
