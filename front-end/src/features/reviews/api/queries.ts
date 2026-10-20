import type { Review } from '@sk/domain/catalog'
import type { DataClient } from '@/features/data-client'

import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { queryKeys, useDataClient } from '@/features/data-client'

export const reviewsQueries = {
  reviews: (client: DataClient) =>
    queryOptions({
      queryKey: queryKeys.reviews.reviews,
      queryFn: client.reviews.reviews,
    }),
}

export function useReviews<T = Review[]>(
  select?: (reviews: Review[]) => T,
): T {
  const client = useDataClient()

  return useSuspenseQuery({ ...reviewsQueries.reviews(client), select }).data
}
