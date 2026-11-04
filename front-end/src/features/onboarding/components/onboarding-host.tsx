import { useLocation, useRouter } from '@tanstack/react-router'
import { lazy, Suspense, useEffect, useEffectEvent, useState } from 'react'

import { useOnboardingAudience } from '../hooks/use-onboarding-audience'
import { useOnboardingRecord } from '../hooks/use-onboarding-record'
import { closeOnboarding, markVisitCaptured, openOnboarding, takeReturnFocus, useOnboardingAutoState, useOnboardingRequest } from '../lib/opener'
import { canOpenOnboarding, flowTrigger } from '../lib/rules'
import { captureEntry, getVisit } from '../lib/visit'

// The flow shows on a first visit or on a tap, so its code stays out of the first load (performance.md, rule 18).
const OnboardingFlow = lazy(() => import('./onboarding-flow'))

/** The element that gets focus back when no control had it before the flow opened: the opener the page marks. */
const RETURN_SELECTOR = '[data-onboarding-return]'

/**
 * Opens the onboarding flow (docs/ux/onboarding-design.md §1, §2), once in the guest shell. It is client only: the server
 * and the first client render give null. A visit is captured on mount. A first visit opens the flow by itself when
 * `flowTrigger` says so; a visit that began elsewhere waits for the guest to reach the home from inside the app. A press
 * on the Account row or the stories line opens it through `openOnboarding`. Staff, an unresolved audience and the private
 * screens never see it.
 */
export function OnboardingHost() {
  const pathname = useLocation({ select: l => l.pathname })
  const searchStr = useLocation({ select: l => l.searchStr })
  const hash = useLocation({ select: l => l.hash })
  const router = useRouter()
  const audience = useOnboardingAudience()
  const record = useOnboardingRecord()
  const request = useOnboardingRequest()
  const { autoDone, captured } = useOnboardingAutoState()

  // An Explore opening is an in-app navigation: the path changed at least once since the host mounted (R7).
  const [seenPath, setSeenPath] = useState(pathname)
  const [navigated, setNavigated] = useState(false)

  if (seenPath !== pathname) {
    setSeenPath(pathname)
    setNavigated(true)
  }

  const capture = useEffectEvent(() => {
    captureEntry({ pathname, search: searchStr, referrer: document.referrer, siteHost: window.location.host })
    markVisitCaptured()
    // The partner redirect marker has been read into the visit; the address goes back to the clean one (replace, no new history entry).
    const params = new URLSearchParams(searchStr)

    if (params.get('via') === 'partner') {
      params.delete('via')
      const rest = params.toString()

      router.history.replace(`${pathname}${rest ? `?${rest}` : ''}${hash ? '#'.concat(hash) : ''}`)
    }
  })

  useEffect(() => {
    capture()
  }, [])

  const wantsAuto = captured && !autoDone && request === null
    && flowTrigger({ record, visit: getVisit(), audience, pathname, isExplore: navigated }) === 'open'

  // The request is kept in the store, so the flow stays open while the guest answers (a saved stay ends "unanswered").
  useEffect(() => {
    if (wantsAuto)
      openOnboarding('first')
  }, [wantsAuto])

  const show = request !== null && canOpenOnboarding({ pathname, audience })

  useEffect(() => {
    if (!show)
      return

    return () => {
      // The Modal restores focus to what had it. This adds only what is missing.
      if (document.activeElement && document.activeElement !== document.body)
        return

      (takeReturnFocus() ?? document.querySelector<HTMLElement>(RETURN_SELECTOR))?.focus()
    }
  }, [show])

  if (!show)
    return null

  return (
    <Suspense fallback={null}>
      <OnboardingFlow mode={request.mode} onClose={closeOnboarding} />
    </Suspense>
  )
}
