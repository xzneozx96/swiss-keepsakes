import type { StoryLanguage } from '../lib/search-params'

import { useKeepsakeLookup, useKeepsakes } from '@/features/keepsakes/api/queries'
import { keepsakeOptionOf } from '../lib/linked-lists'
import { PICKER_RESULTS } from './use-pin-options'

/**
 * The keepsakes a story already links, as choices, read by id (their names, photos and whether they are published). Never the
 * whole list. Empty while it loads or when it failed; `enabled` false, or no ids, reads nothing.
 */
export function useKeepsakeOptions(storeId: string, language: StoryLanguage, ids: string[], enabled = true) {
  const keepsakes = useKeepsakeLookup(storeId, ids, enabled)

  return {
    keepsakes: keepsakes.data?.items.map(item => keepsakeOptionOf(item, language)) ?? [],
    isLoading: keepsakes.isLoading,
    isError: keepsakes.isError,
    refetch: () => void keepsakes.refetch(),
  }
}

/** The keepsake picker's search: the first matches of `query` among the published keepsakes (live, with or without pending edits), on the server. */
export function useKeepsakeSearch(storeId: string, language: StoryLanguage, query: string) {
  const keepsakes = useKeepsakes(storeId, { status: 'published,editsNotLive', q: query.trim() || undefined, page: 1, pageSize: PICKER_RESULTS })

  return {
    keepsakes: keepsakes.data?.items.map(item => keepsakeOptionOf(item, language)) ?? [],
    isLoading: keepsakes.isPending,
    isError: keepsakes.isError,
    refetch: () => void keepsakes.refetch(),
  }
}
