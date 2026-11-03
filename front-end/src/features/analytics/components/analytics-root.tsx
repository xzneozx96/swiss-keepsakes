import { useQuery } from '@tanstack/react-query'
import { useRouterState } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'

import { storedLanguage } from '@/contexts/locale-context'
import { sessionUserQuery, useMe } from '@/features/stores/api/queries'
import { analyticsEnabled } from '@/lib/analytics/config'
import { languageOf, pageTypeOf } from '@/lib/analytics/page-type'
import { track } from '@/lib/analytics/track'
import { apiEnabled } from '@/lib/api-mode'
import { isPrivatePath } from '@/lib/private-routes'

const FIVE_MINUTES = 5 * 60 * 1000

type Gate = 'allow' | 'hold' | 'skip'

/**
 * Whether the guest site may report for this browser (R5, ADR-032). With the API off there is no session, so yes. With it on, a
 * signed-out visitor or a signed-in guest may be reported; a signed-in merchant (one or more stores) is not; while the session or the stores
 * are unresolved or failed the answer is `hold`, and nothing is reported.
 */
function useGate(): Gate {
  // With the sender off the lookups are never made: no request for a guest while production is switched off.
  const lookup = apiEnabled && analyticsEnabled()
  const session = useQuery({ ...sessionUserQuery, enabled: lookup, staleTime: FIVE_MINUTES, refetchOnWindowFocus: false })
  const signedIn = session.data != null
  const me = useMe(lookup && signedIn)

  if (!lookup)
    return 'allow'
  if (session.isPending || session.isError)
    return 'hold'
  if (!signedIn)
    return 'allow'
  if (me.isPending || me.isError)
    return 'hold'

  return me.data.stores.length > 0 ? 'skip' : 'allow'
}

/** Reports a `page_view` on each change of the guest path. It renders nothing and does its work in an effect, so never on the server. */
export function AnalyticsRoot(): null {
  const pathname = useRouterState({ select: state => state.location.pathname })
  const gate = useGate()
  const reportedRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (gate !== 'allow' || isPrivatePath(pathname) || reportedRef.current === pathname)
      return

    reportedRef.current = pathname
    track('page_view', { pageType: pageTypeOf(pathname), language: languageOf(pathname) ?? storedLanguage() })
  }, [gate, pathname])

  return null
}
