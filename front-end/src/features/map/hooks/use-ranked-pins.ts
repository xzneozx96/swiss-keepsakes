import type { PublicMapItem } from '@sk/api-contract'
import type { RankPrefs } from '@sk/domain/content'

import { rankByTags } from '@sk/domain/content'
import { useMemo } from 'react'
import { useOnboardingAnswers } from '@/features/onboarding/hooks/use-onboarding-answers'

const changesOrder = ({ stay, interests }: RankPrefs) => Boolean(stay) || (interests?.length ?? 0) > 0

/**
 * The pins in the guest's order (ADR-006, AC93). With no answers it is the server's array itself. Otherwise the order is
 * worked out again only when the pins or the answers change, never on a map move or other state. useMemo keeps the
 * array's identity: the map screen passes it to other hooks as a dependency.
 */
export function useRankedPins(pins: PublicMapItem[]): PublicMapItem[] {
  const answers = useOnboardingAnswers()

  return useMemo(() => (changesOrder(answers) ? rankByTags(pins, answers) : pins), [pins, answers])
}
