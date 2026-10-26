import type { AdviceQuestionSet, AdviceRequest } from '@sk/domain/requests'
import type { DataClient } from '@/features/data-client'

import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { queryKeys, useDataClient } from '@/features/data-client'

export const requestsQueries = {
  adviceQuestions: (client: DataClient) =>
    queryOptions({
      queryKey: queryKeys.requests.adviceQuestions,
      queryFn: client.requests.adviceQuestions,
    }),
  adviceRequests: (client: DataClient) =>
    queryOptions({
      queryKey: queryKeys.requests.adviceRequests,
      queryFn: client.requests.adviceRequests,
    }),
  privateTourRequests: (client: DataClient) =>
    queryOptions({
      queryKey: queryKeys.requests.privateTourRequests,
      queryFn: client.requests.privateTourRequests,
    }),
}

export function useAdviceQuestions<T = AdviceQuestionSet>(
  select?: (questions: AdviceQuestionSet) => T,
): T {
  const client = useDataClient()

  return useSuspenseQuery({ ...requestsQueries.adviceQuestions(client), select }).data
}

export function useAdviceRequests<T = AdviceRequest[]>(
  select?: (adviceRequests: AdviceRequest[]) => T,
): T {
  const client = useDataClient()

  return useSuspenseQuery({ ...requestsQueries.adviceRequests(client), select }).data
}
