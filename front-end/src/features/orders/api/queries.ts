import type { Order } from '@sk/domain/orders'
import type { DataClient } from '@/features/data-client'

import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { queryKeys, useDataClient } from '@/features/data-client'

export const ordersQueries = {
  orders: (client: DataClient) =>
    queryOptions({
      queryKey: queryKeys.orders.orders,
      queryFn: client.orders.orders,
    }),
}

export function useOrders<T = Order[]>(
  select?: (orders: Order[]) => T,
): T {
  const client = useDataClient()

  return useSuspenseQuery({ ...ordersQueries.orders(client), select }).data
}
