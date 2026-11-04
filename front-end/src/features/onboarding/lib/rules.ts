import type { OnboardingRecord } from './record'
import type { Visit } from './visit'

import { isPrivatePath } from '@/lib/private-routes'
import { isUnanswered } from './answers-store'
import { isHomePath } from './visit'

const TRAILING_SLASHES = /\/+$/

export type OnboardingAudience = 'guest' | 'staff' | 'unknown'

/**
 * Whether the flow may show at all (AC92, design 1). Only a known guest on a public page: staff, an audience still unresolved
 * and the private screens (`/store`, `/partner`, `/admin`, `/sign-in`, `/invitation` and the rest) never see it.
 */
export function canShowOnboarding({ pathname, audience }: { pathname: string, audience: OnboardingAudience }): boolean {
  return audience === 'guest' && !isPrivatePath(pathname)
}

/**
 * Whether a requested flow may show. Like `canShowOnboarding`, and also on the Account tab (a private path), where the
 * "Your trip" row opens it. Nothing opens by itself there: `flowTrigger` only fires on the home.
 */
export function canOpenOnboarding({ pathname, audience }: { pathname: string, audience: OnboardingAudience }): boolean {
  return canShowOnboarding({ pathname, audience }) || (audience === 'guest' && pathname.replace(TRAILING_SLASHES, '') === '/account')
}

/**
 * Whether the flow opens by itself now (AC91, design 1). Only an unanswered guest who has not skipped, on a page where the flow may show:
 * - a visit that began at the home opens it on the home;
 * - a visit that began anywhere else (story, pin, keepsake, partner QR or link, search result) opens it only at an Explore opening.
 * `isExplore` is that opening (R7): the home tab became the current page after the visit began elsewhere, through navigation inside the app.
 * Hiding the deep-link card (`visit.cardHidden`) is not a skip, so it does not change the answer.
 */
export function flowTrigger({ record, visit, audience, pathname, isExplore }: {
  record: OnboardingRecord
  visit: Visit | null
  audience: OnboardingAudience
  pathname: string
  isExplore: boolean
}): 'open' | 'wait' {
  if (!visit || !isUnanswered(record) || !canShowOnboarding({ pathname, audience }) || !isHomePath(pathname))
    return 'wait'

  return visit.entry === 'home' || isExplore ? 'open' : 'wait'
}
