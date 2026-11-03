import type { StoryLanguage } from '../lib/search-params'

import { useKeepsakes } from '@/features/keepsakes/api/queries'
import { keepsakeOptionOf } from '../lib/linked-lists'

/** Every keepsake of the store as a choice, from the list the publish checks share. Empty while it loads or when it failed. */
export function useKeepsakeOptions(storeId: string, language: StoryLanguage) {
  const keepsakes = useKeepsakes(storeId)

  return {
    keepsakes: keepsakes.data?.items.map(item => keepsakeOptionOf(item, language)) ?? [],
    isLoading: keepsakes.isLoading,
    isError: keepsakes.isError,
    refetch: () => void keepsakes.refetch(),
  }
}
