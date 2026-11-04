import type { RankPrefs } from '@sk/domain/content'
import type { OnboardingRecord } from '../lib/record'

import { hasAnswers } from '../lib/answers-store'
import { useOnboardingRecord } from './use-onboarding-record'

const NO_ANSWERS: RankPrefs = { stay: null, interests: [] }

let last: { record: OnboardingRecord, prefs: RankPrefs } | undefined

/** The rank preferences of a record. One object per record, so the snapshot is stable until the answers change. */
function prefsOf(record: OnboardingRecord): RankPrefs {
  if (!hasAnswers(record))
    return NO_ANSWERS

  if (last?.record !== record)
    last = { record, prefs: { stay: record.segment, interests: record.interests } }

  return last.prefs
}

/**
 * What the guest said in the onboarding flow, from the browser store `sk.onboarding` (ADR-006). The server and the first
 * client render have no answers, so the HTML matches; the lists apply the answers after hydration.
 */
export function useOnboardingAnswers(): RankPrefs {
  return prefsOf(useOnboardingRecord())
}
