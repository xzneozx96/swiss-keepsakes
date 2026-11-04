import { useQuery } from '@tanstack/react-query'

import { useLocale } from '@/contexts/locale-context'
import { guestKeepsakeList } from '@/features/catalog/api/keepsake-list-query'
import { toKeepsakeCard } from '@/features/catalog/lib/keepsake-card'
import { apiEnabled } from '@/lib/api-mode'

/**
 * The cards of the showcase, read from the public keepsake list (`GET /api/public/keepsakes`, the list page's own read and
 * card mapping, so no price; sold out ones left out). A plain query, so a slow or failed read is data for the block (a skeleton, an error with retry)
 * and never a suspended page, on the server or in the browser.
 */
export function useVictorinoxItems() {
  const { language, t } = useLocale()
  const { data, isPending, isError, refetch } = useQuery({
    ...guestKeepsakeList(language),
    enabled: apiEnabled,
    // The shipped showcase has no sold-out state, so a sold-out keepsake is left out.
    select: list => list.items.filter(item => !item.soldOut).map(item => toKeepsakeCard(item, t)),
  })

  return { items: data ?? [], isPending: apiEnabled && isPending, isFailed: isError, retry: () => void refetch() }
}
