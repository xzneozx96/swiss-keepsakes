import type { StoryLanguage } from '../lib/search-params'

import { useLocale } from '@/contexts/locale-context'
import { usePinLookup, usePlaces } from '@/features/places/api/queries'
import { pinOptionOf } from '../lib/pins'

/** The most results a picker's search shows (ADR-033 section 10). */
export const PICKER_RESULTS = 20

/**
 * The pins a story references, as choices, read by id (and, with `host`, the published pins linking to that host). Never the whole
 * list. Empty while it loads, when it failed or when there is nothing to look up.
 */
export function usePinOptions(storeId: string, language: StoryLanguage, want: { ids?: string[], host?: string, enabled?: boolean }) {
  const { t } = useLocale()
  const places = usePinLookup(storeId, want.ids ?? [], want.host, want.enabled ?? true)
  const untitled = t('storyMedia.pin.untitled')

  return {
    pins: places.data?.items.map(item => pinOptionOf(item, language, untitled)) ?? [],
    isLoading: places.isLoading,
    isError: places.isError,
  }
}

/** The pin picker's search: the first matches of `query` on the server, as the store's pins read in the list. Waits for the first answer, then keeps it while the next loads. */
export function usePinSearch(storeId: string, language: StoryLanguage, query: string) {
  const { t } = useLocale()
  const places = usePlaces(storeId, { q: query.trim() || undefined, page: 1, pageSize: PICKER_RESULTS })
  const untitled = t('storyMedia.pin.untitled')

  return {
    pins: places.data?.items.map(item => pinOptionOf(item, language, untitled)) ?? [],
    isLoading: places.isPending,
    isError: places.isError,
  }
}
