import type { PrivateTourRequest } from '@sk/domain/requests'

import { useSuspenseQuery } from '@tanstack/react-query'
import { useDataClient } from '@/features/data-client'
import { requestsQueries } from '@/features/requests/api/queries'

export function usePrivateTourRequests<T = PrivateTourRequest[]>(
  select?: (privateTourRequests: PrivateTourRequest[]) => T,
): T {
  const client = useDataClient()

  return useSuspenseQuery({ ...requestsQueries.privateTourRequests(client), select }).data
}
