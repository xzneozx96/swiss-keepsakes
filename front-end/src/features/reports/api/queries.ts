import type { CostRecord } from '@sk/domain/reporting'
import type { DataClient } from '@/features/data-client'

import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { queryKeys, useDataClient } from '@/features/data-client'

export const reportsQueries = {
  costs: (client: DataClient) =>
    queryOptions({
      queryKey: queryKeys.reports.costs,
      queryFn: client.reports.costs,
    }),
}

export function useCosts<T = CostRecord[]>(
  select?: (costs: CostRecord[]) => T,
): T {
  const client = useDataClient()

  return useSuspenseQuery({ ...reportsQueries.costs(client), select }).data
}
