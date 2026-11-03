import type { StoryLanguage } from '../lib/search-params'

import { useKeepsakes } from '@/features/keepsakes/api/queries'
import { keepsakeOptionOf } from '../lib/linked-lists'

/**
 * Every keepsake of the store as a choice, from the list the publish checks share. Empty while it loads or when it failed.
 * `enabled` false reads nothing: a card whose story names no keepsake leaves the list unread until its picker opens.
 */
export function useKeepsakeOptions(storeId: string, language: StoryLanguage, enabled = true) {
  const keepsakes = useKeepsakes(enabled ? storeId : undefined)

  return {
    keepsakes: keepsakes.data?.items.map(item => keepsakeOptionOf(item, language)) ?? [],
    isLoading: keepsakes.isLoading,
    isError: keepsakes.isError,
    refetch: () => void keepsakes.refetch(),
  }
}
