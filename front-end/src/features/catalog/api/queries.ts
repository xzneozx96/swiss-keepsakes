import type { PickupPlace, Product, Subcategory } from '@sk/domain/catalog'
import type { DataClient } from '@/features/data-client'

import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { queryKeys, useDataClient } from '@/features/data-client'

export const catalogQueries = {
  products: (client: DataClient) =>
    queryOptions({
      queryKey: queryKeys.catalog.products,
      queryFn: client.catalog.products,
    }),
  subcategories: (client: DataClient) =>
    queryOptions({
      queryKey: queryKeys.catalog.subcategories,
      queryFn: client.catalog.subcategories,
    }),
  pickupPlaces: (client: DataClient) =>
    queryOptions({
      queryKey: queryKeys.catalog.pickupPlaces,
      queryFn: client.catalog.pickupPlaces,
    }),
}

export function useProducts<T = Product[]>(
  select?: (products: Product[]) => T,
): T {
  const client = useDataClient()

  return useSuspenseQuery({ ...catalogQueries.products(client), select }).data
}

export function useStoreSubcategories<T = Subcategory[]>(
  select?: (subcategories: Subcategory[]) => T,
): T {
  const client = useDataClient()

  return useSuspenseQuery({ ...catalogQueries.subcategories(client), select }).data
}

export function usePickupPlaces<T = PickupPlace[]>(
  select?: (pickupPlaces: PickupPlace[]) => T,
): T {
  const client = useDataClient()

  return useSuspenseQuery({ ...catalogQueries.pickupPlaces(client), select }).data
}
