import { Alert, Button } from '@heroui/react'
import { useHydrated } from '@tanstack/react-router'

import { FilterIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { useOnboardingAnswers } from '@/features/onboarding/hooks/use-onboarding-answers'
import { openOnboarding } from '@/features/onboarding/lib/opener'

/**
 * The sort notice, a full-width HeroUI Alert in the "First time in Lucerne?" block (owner, 05.11.2026; it sat under "See these
 * first" before): what the home is sorted for, or the offer to sort it, with a button that opens the onboarding flow in change
 * mode. It is the page's only personalisation signal. Once answered it says "Sorted for your trip" and does not list the answers:
 * a list read badly ("Sorted for Just today") and wrapped on a phone (owner, 06.11.2026). The server and the first client render show the offer, as the lists do;
 * the answers apply once the page is hydrated. The title rises in when it changes, only with motion allowed.
 */
export function SortNotice() {
  const { t } = useLocale()
  const hydrated = useHydrated()
  const stored = useOnboardingAnswers()
  const answered = hydrated && (Boolean(stored.stay) || (stored.interests ?? []).length > 0)
  const text = answered ? t('homePage.sort.for') : t('homePage.sort.personalise')

  return (
    <Alert className="w-full items-center" status="accent">
      <Alert.Indicator>
        <FilterIcon aria-hidden size={18} />
      </Alert.Indicator>
      <Alert.Content>
        {/* The accent stays on the icon; the sentence reads in the body colour (owner, 05.11.2026: all-red text was too loud). */}
        <Alert.Title key={text} className="font-medium text-foreground motion-safe:animate-rise">{text}</Alert.Title>
        {!answered && <Alert.Description>{t('homePage.sort.hint')}</Alert.Description>}
      </Alert.Content>
      {/* The visible word is short; the name says what is sorted, so the button makes sense on its own. */}
      <Button aria-label={answered ? `${text}, ${t('homePage.sort.change')}` : text} className="shrink-0" size="sm" variant="secondary" onPress={() => openOnboarding('change')}>
        {answered ? t('homePage.sort.change') : t('homePage.sort.start')}
      </Button>
    </Alert>
  )
}
