import type { PinListQuery, StoryOptionsQuery } from './client'
import type { DataClient } from '@/features/data-client'

import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query'
import { queryKeys, readAllNumberedPages, useDataClient, WHOLE_LIST_PAGE_SIZE } from '@/features/data-client'
import { fromApi } from '@/features/data-client/api-transport'

export const placesQueries = {
  // One page of the table, its filters in the key so a new filter is its own read.
  list: (client: DataClient, storeId: string, query: PinListQuery) =>
    queryOptions({
      ...fromApi,
      queryKey: [...queryKeys.places.list, storeId, query],
      queryFn: () => client.places.list({ storeId, query }),
    }),
  // Every pin, page after page, for the screens that look pins up by id (debt: ADR-033 slice 4).
  all: (client: DataClient, storeId: string) =>
    queryOptions({
      ...fromApi,
      queryKey: [...queryKeys.places.list, storeId, 'all'],
      queryFn: async () => ({ items: await readAllNumberedPages(page => client.places.list({ storeId, query: { page, pageSize: WHOLE_LIST_PAGE_SIZE } }), 'pins') }),
    }),
  pin: (client: DataClient, storeId: string, id: string) =>
    queryOptions({
      ...fromApi,
      // A form starts from this read, so a refetch on focus must not replace what the merchant typed.
      refetchOnWindowFocus: false,
      queryKey: [...queryKeys.places.pin, storeId, id],
      queryFn: () => client.places.get({ storeId, id }),
    }),
  storyOptions: (client: DataClient, storeId: string, query: StoryOptionsQuery) =>
    queryOptions({
      ...fromApi,
      queryKey: [...queryKeys.places.storyOptions, storeId, query],
      queryFn: () => client.places.storyOptions({ storeId, query }),
    }),
  storyVersion: (client: DataClient, storeId: string, groupId: string, language: 'en' | 'de') =>
    queryOptions({
      ...fromApi,
      queryKey: [...queryKeys.places.storyVersion, storeId, groupId, language],
      queryFn: () => client.places.storyVersion({ storeId, groupId, language }),
    }),
}

/** One page of the pins table. The last page stays on screen while the next one loads. Waits while the store id is unknown. */
export function usePlaces(storeId: string | undefined, query: PinListQuery) {
  const client = useDataClient()

  return useQuery({ ...placesQueries.list(client, storeId ?? '', query), enabled: storeId !== undefined, placeholderData: keepPreviousData })
}

/** Every pin of the store, for a screen that looks pins up by id. Waits while the store id is unknown. */
export function useAllPlaces(storeId: string | undefined) {
  const client = useDataClient()

  return useQuery({ ...placesQueries.all(client, storeId ?? ''), enabled: storeId !== undefined })
}

/** One pin for the editor; `enabled` is false for a new pin. */
export function usePlace(storeId: string | undefined, id: string, enabled: boolean) {
  const client = useDataClient()

  return useQuery({ ...placesQueries.pin(client, storeId ?? '', id), enabled: enabled && storeId !== undefined })
}

/** The story picker's matches for `query`, and the chosen story. The last answer stays while the next search loads. */
export function useStoryOptions(storeId: string | undefined, query: StoryOptionsQuery) {
  const client = useDataClient()

  return useQuery({ ...placesQueries.storyOptions(client, storeId ?? '', query), enabled: storeId !== undefined, placeholderData: keepPreviousData })
}

/** The text of the story's version in a language, read when `enabled` (the sheet is open). A story with no version in the language is a 404 `ApiProblem`. */
export function useStoryVersion(storeId: string | undefined, groupId: string | null, language: 'en' | 'de', enabled: boolean) {
  const client = useDataClient()

  return useQuery({ ...placesQueries.storyVersion(client, storeId ?? '', groupId ?? '', language), enabled: enabled && storeId !== undefined && groupId !== null })
}
