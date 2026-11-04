import type { Me } from '@sk/api-contract'

import { useQuery } from '@tanstack/react-query'

import { apiEnabled } from '@/lib/api-mode'
import { sessionUserQuery, useMe } from '../api/queries'
import { currentStore } from '../lib/current-store'

/**
 * The signed-in account for the merchant sidebar: the display name from the session (the email's local part
 * when it has none) and the role in the store the store pages work on (`currentStore`). Both reads are the
 * ones Settings and the gates already make, so they share the cache.
 */
export function useStaffAccount(): { loading: boolean, name: string, role: Me['stores'][number]['role'] | undefined } {
  const user = useQuery(sessionUserQuery)
  const me = useMe(apiEnabled)
  const name = user.data?.name?.trim() || user.data?.email.split('@')[0] || ''

  return { loading: user.isPending || me.isPending, name, role: currentStore(me.data)?.role }
}
