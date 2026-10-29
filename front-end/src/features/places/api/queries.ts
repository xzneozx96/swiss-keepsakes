import type { DataClient } from '@/features/data-client'

import { queryOptions, useQuery } from '@tanstack/react-query'
import { queryKeys, useDataClient } from '@/features/data-client'
import { fromApi } from '@/features/data-client/api-transport'

export const placesQueries = {
  list: (client: DataClient, storeId: string) =>
    queryOptions({
      ...fromApi,
      queryKey: [...queryKeys.places.list, storeId],
      queryFn: () => client.places.list({ storeId }),
    }),
  pin: (client: DataClient, storeId: string, id: string) =>
    queryOptions({
      ...fromApi,
      // A form starts from this read, so a refetch on focus must not replace what the merchant typed.
      refetchOnWindowFocus: false,
      queryKey: [...queryKeys.places.pin, storeId, id],
      queryFn: () => client.places.get({ storeId, id }),
    }),
  storyOptions: (client: DataClient, storeId: string) =>
    queryOptions({
      ...fromApi,
      queryKey: [...queryKeys.places.storyOptions, storeId],
      queryFn: () => client.places.storyOptions({ storeId }),
    }),
  media: (client: DataClient, storeId: string, id: string) =>
    queryOptions({
      ...fromApi,
      queryKey: [...queryKeys.places.media, storeId, id],
      queryFn: () => client.places.media({ storeId, id }),
      // A photo is "processing" for a moment after the upload.
      refetchInterval: query => (query.state.data?.status === 'processing' ? 2000 : false),
    }),
}

/** Every pin of the store. Waits while the store id is unknown. */
export function usePlaces(storeId: string | undefined) {
  const client = useDataClient()

  return useQuery({ ...placesQueries.list(client, storeId ?? ''), enabled: storeId !== undefined })
}

/** One pin for the editor; `enabled` is false for a new pin. */
export function usePlace(storeId: string | undefined, id: string, enabled: boolean) {
  const client = useDataClient()

  return useQuery({ ...placesQueries.pin(client, storeId ?? '', id), enabled: enabled && storeId !== undefined })
}

export function useStoryOptions(storeId: string | undefined) {
  const client = useDataClient()

  return useQuery({ ...placesQueries.storyOptions(client, storeId ?? ''), enabled: storeId !== undefined })
}

export function useMedia(storeId: string | undefined, id: string | null) {
  const client = useDataClient()

  return useQuery({ ...placesQueries.media(client, storeId ?? '', id ?? ''), enabled: storeId !== undefined && id !== null })
}
