import type { PublicLanguage } from '@sk/api-contract'
import { queryOptions } from '@tanstack/react-query'
import { fromApi } from '@/features/data-client/api-transport'
import { queryKeys } from '@/features/data-client/query-keys'
import { fetchKeepsakeList } from './keepsakes'

/**
 * The guest keepsake list, one cache entry per language for every reader (the home showcase, the tour block, the search).
 * Each reader takes what it needs with `select`. The key is not under the merchant prefix, so a merchant change never refetches it.
 */
export function guestKeepsakeList(lang: PublicLanguage) {
  return queryOptions({ ...fromApi, queryKey: [...queryKeys.keepsakes.publicList, lang], queryFn: () => fetchKeepsakeList(lang) })
}
