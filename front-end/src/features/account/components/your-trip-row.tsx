import type { InterestCode } from '@sk/domain/content'

import { ExploreIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { useOnboardingAnswers } from '@/features/content/hooks/use-onboarding-answers'
import { useOnboardingAudience } from '@/features/onboarding/hooks/use-onboarding-audience'
import { openOnboarding } from '@/features/onboarding/lib/opener'
import { itemClass, rowClass, RowIcon } from './settings-list'

/**
 * The Account reopen entry of the onboarding flow (docs/ux/onboarding-design.md §2): "Your trip" with the answers as its value,
 * or "Not set yet". It opens the flow in change mode. Guests only: staff and an audience not yet known do not see it.
 */
export function YourTripRow() {
  const { t } = useLocale()
  const audience = useOnboardingAudience()
  const answers = useOnboardingAnswers()

  if (audience !== 'guest')
    return null

  const named = [
    ...(answers.stay ? [t(`stories.sort.stay.${answers.stay}`)] : []),
    ...(answers.interests ?? []).map((code: InterestCode) => t(`places.interest.${code}`)),
  ]

  return (
    <li className={itemClass}>
      <button className={rowClass} type="button" onClick={() => openOnboarding('change')}>
        <RowIcon icon={ExploreIcon} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-medium">{t('onboarding.account.row')}</span>
          <span className="line-clamp-2 text-sm text-muted">{named.length > 0 ? named.join(', ') : t('onboarding.account.empty')}</span>
        </span>
      </button>
    </li>
  )
}
