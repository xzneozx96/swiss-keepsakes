import type { RankPrefs } from '@sk/domain/content'

const NO_ANSWERS: RankPrefs = { stay: null, interests: [] }

/**
 * What the guest said in the onboarding flow. The flow and its `sk.onboarding` store arrive with T-E4.5a; until then
 * nobody has answers, so every list keeps the server order. The hook is the one place that ticket changes.
 */
// A hook already, so the pages call it as they will when T-E4.5a reads the store here.
// eslint-disable-next-line react/no-unnecessary-use-prefix
export function useOnboardingAnswers(): RankPrefs {
  return NO_ANSWERS
}
