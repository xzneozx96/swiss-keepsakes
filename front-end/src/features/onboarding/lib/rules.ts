import type { OnboardingRecord } from './record'
import type { Visit } from './visit'

import { isLanguage } from '@/lib/language-routing'
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
 * "Your trip" row opens it. Nothing opens by itself there: `flowTrigger` only fires on the home. Staff never get the flow by
 * itself (AC92), but a tap on a public page opens it, so a merchant can preview it (owner, 05.11.2026).
 */
export function canOpenOnboarding({ pathname, audience }: { pathname: string, audience: OnboardingAudience }): boolean {
  return canShowOnboarding({ pathname, audience })
    || (audience === 'staff' && !isPrivatePath(pathname))
    || (audience === 'guest' && pathname.replace(TRAILING_SLASHES, '') === '/account')
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

/** A story page: `/{lang}/stories/{slug}`, with or without a trailing slash. Not the list, not a tour, not a keepsake. */
function isStoryPath(pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean)

  return segments.length === 3 && isLanguage(segments[0]) && segments[1] === 'stories'
}

/**
 * Whether the deep-link card (N24) may show (AC91, AC92, design 3). Only a known guest with no answers who has not skipped,
 * whose visit began on a deep link, a partner link or a search result (`entry` is `other`), who has not hidden it in this
 * visit, on a story page. The 10 seconds are the card's own timer.
 */
export function showsCard({ record, visit, audience, pathname }: {
  record: OnboardingRecord
  visit: Visit | null
  audience: OnboardingAudience
  pathname: string
}): boolean {
  return visit !== null && visit.entry === 'other' && !visit.cardHidden
    && isUnanswered(record) && canShowOnboarding({ pathname, audience }) && isStoryPath(pathname)
}
