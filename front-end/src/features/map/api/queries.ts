import { queryOptions, useQuery } from '@tanstack/react-query'

import { fromApi } from '@/features/data-client/api-transport'
import { apiEnabled } from '@/lib/api-mode'
import { fetchMapCategories, fetchMapPins } from './map-client'

type Language = 'en' | 'de'

// The reads need the API. The demo build (no `VITE_API_ENABLED`) has none, so it sends no request and the map shows no places.
export const mapQueries = {
  pins: (language: Language) =>
    queryOptions({
      ...fromApi,
      queryKey: ['map', 'pins', language],
      queryFn: () => fetchMapPins(language),
      enabled: apiEnabled,
    }),
  categories: (language: Language) =>
    queryOptions({
      ...fromApi,
      queryKey: ['map', 'categories', language],
      queryFn: () => fetchMapCategories(language),
      enabled: apiEnabled,
    }),
}

/** The pins and the top-level categories of the guest map, with one `isFailed` and one `retry` for both reads. */
export function useMapData(language: Language) {
  const pins = useQuery(mapQueries.pins(language))
  const categories = useQuery(mapQueries.categories(language))

  return {
    pins: pins.data ?? [],
    categories: categories.data ?? [],
    isPending: apiEnabled && (pins.isPending || categories.isPending),
    isFailed: pins.isError || categories.isError,
    retry() {
      if (pins.isError)
        void pins.refetch()
      if (categories.isError)
        void categories.refetch()
    },
  }
}
