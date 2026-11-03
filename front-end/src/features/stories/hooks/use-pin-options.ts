import type { StoryLanguage } from '../lib/search-params'

import { useLocale } from '@/contexts/locale-context'
import { usePlaces } from '@/features/places/api/queries'
import { pinOptionOf } from '../lib/pins'

/** Every pin of the store as a choice, from the one list read the Places screen shares. Empty while it loads or when it failed. `enabled` false reads nothing (a card whose story names no pin waits for its picker). */
export function usePinOptions(storeId: string, language: StoryLanguage, enabled = true) {
  const { t } = useLocale()
  const places = usePlaces(enabled ? storeId : undefined)
  const untitled = t('storyMedia.pin.untitled')

  return {
    pins: places.data?.items.map(item => pinOptionOf(item, language, untitled)) ?? [],
    isLoading: places.isLoading,
    isError: places.isError,
  }
}
