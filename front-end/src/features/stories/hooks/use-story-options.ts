import type { StoryLanguage } from '../lib/search-params'

import { useLocale } from '@/contexts/locale-context'
import { useAllStories } from '../api/queries'
import { storyOptionOf } from '../lib/linked-lists'

/**
 * Every story of the store as a choice, the one being edited included (the sheet leaves it out). Empty while it loads or when it failed.
 * `enabled` false reads nothing: a card whose story names no related story leaves the list unread until its picker opens.
 */
export function useStoryOptions(storeId: string, language: StoryLanguage, enabled = true) {
  const { t } = useLocale()
  const stories = useAllStories(enabled ? storeId : undefined)
  const untitled = t('merchantStories.untitled')

  return {
    stories: stories.data?.items.map(item => storyOptionOf(item, language, untitled)) ?? [],
    isLoading: stories.isLoading,
    isError: stories.isError,
    refetch: () => void stories.refetch(),
  }
}
