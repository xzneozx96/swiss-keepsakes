import { useQuery } from '@tanstack/react-query'

import { useLocale } from '@/contexts/locale-context'
import { fetchKeepsakeList } from '@/features/catalog/api/keepsakes'
import { toKeepsakeCard } from '@/features/catalog/lib/keepsake-card'
import { fromApi } from '@/features/data-client/api-transport'

/**
 * The cards of the showcase, read from the public keepsake list (`GET /api/public/keepsakes`, the list page's own read and
 * card mapping, so no price). A plain query, so a slow or failed read is data for the block (a skeleton, an error with retry)
 * and never a suspended page, on the server or in the browser.
 */
export function useVictorinoxItems() {
  const { language, t } = useLocale()
  const { data, isPending, isError, refetch } = useQuery({
    ...fromApi,
    queryKey: ['home', 'keepsakes', language],
    queryFn: () => fetchKeepsakeList(language),
    select: list => list.items.map(item => toKeepsakeCard(item, t)),
  })

  return { items: data ?? [], isPending, isFailed: isError, retry: () => void refetch() }
}
