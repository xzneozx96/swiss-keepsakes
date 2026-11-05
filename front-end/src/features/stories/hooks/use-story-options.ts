import type { StoryLanguage } from '../lib/search-params'

import { useLocale } from '@/contexts/locale-context'
import { useStories, useStoryLookup } from '../api/queries'
import { storyOptionOf } from '../lib/linked-lists'
import { PICKER_RESULTS } from './use-pin-options'

/**
 * The stories a story already references, as choices, read by id (the related stories' names and states). Never the whole list.
 * Empty while it loads or when it failed; `enabled` false, or no ids, reads nothing.
 */
export function useStoryOptions(storeId: string, language: StoryLanguage, ids: string[], enabled = true) {
  const { t } = useLocale()
  const stories = useStoryLookup(storeId, ids, enabled)
  const untitled = t('merchantStories.untitled')

  return {
    stories: stories.data?.items.map(item => storyOptionOf(item, language, untitled)) ?? [],
    isLoading: stories.isLoading,
    isError: stories.isError,
    refetch: () => void stories.refetch(),
  }
}

/** The related-stories picker's search: the first matches of `query` on the server. The own story is left out by the sheet. */
export function useStorySearch(storeId: string, language: StoryLanguage, query: string) {
  const { t } = useLocale()
  const stories = useStories(storeId, { q: query.trim() || undefined, page: 1, pageSize: PICKER_RESULTS })
  const untitled = t('merchantStories.untitled')

  return {
    stories: stories.data?.items.map(item => storyOptionOf(item, language, untitled)) ?? [],
    isLoading: stories.isPending,
    isError: stories.isError,
    refetch: () => void stories.refetch(),
  }
}
