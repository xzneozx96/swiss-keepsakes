import type { OnboardingAudience } from '../lib/rules'

import { useQuery } from '@tanstack/react-query'

import { sessionUserQuery, useMe } from '@/features/stores/api/queries'
import { apiEnabled } from '@/lib/api-mode'

const FIVE_MINUTES = 5 * 60 * 1000

/**
 * Who the visitor is, for the onboarding flow (AC92). It mirrors the analytics gate (`analytics-root.tsx`): with the API off
 * nobody is staff; with it on, `unknown` while the session or the stores are unresolved or failed, so a merchant never sees a
 * flash of the flow; a signed-out visitor or a signed-in user without a store is a guest; a platform admin or a user with a
 * store is staff. The reads are the ones the gates already make, so they share the cache.
 */
export function useOnboardingAudience(): OnboardingAudience {
  const session = useQuery({ ...sessionUserQuery, enabled: apiEnabled, staleTime: FIVE_MINUTES, refetchOnWindowFocus: false })
  const signedIn = session.data != null
  const me = useMe(apiEnabled && signedIn)

  if (!apiEnabled)
    return 'guest'
  if (session.isPending || session.isError)
    return 'unknown'
  if (!signedIn)
    return 'guest'
  if (me.isPending || me.isError)
    return 'unknown'

  return me.data.platformAdmin || me.data.stores.length > 0 ? 'staff' : 'guest'
}
