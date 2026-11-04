import { Button } from '@heroui/react'
import { useLocation } from '@tanstack/react-router'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

import { CloseIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { photoUrl } from '@/lib/photos'
import { useOnboardingAudience } from '../hooks/use-onboarding-audience'
import { getRecord, getServerRecord, subscribe } from '../lib/answers-store'
import { openOnboarding } from '../lib/opener'
import { showsCard } from '../lib/rules'
import { getVisit, hideCard, subscribeVisit } from '../lib/visit'

/** The card shows this long after the story page opens (docs/ux/onboarding-design.md §3). */
export const NUDGE_DELAY_MS = 10_000

/**
 * N24, the deep-link card (docs/ux/onboarding-design.md §3). It floats under the top edge of the 430px frame and never enters
 * the story's text, so the text does not move. It is client only: the server and the first client render give null. One
 * timer starts when the page opens and is cleared when the guest leaves, hides the card or answers. Once shown it stays until
 * hidden. The × and Escape hide it for this visit only (a session flag, not a skip); the button opens the flow.
 */
export function OnboardingCard() {
  const { t } = useLocale()
  const pathname = useLocation({ select: l => l.pathname })
  const audience = useOnboardingAudience()
  const record = useSyncExternalStore(subscribe, getRecord, getServerRecord)
  const visit = useSyncExternalStore(subscribeVisit, getVisit, () => null)
  const eligible = showsCard({ record, visit, audience, pathname })
  const [shown, setShown] = useState(false)
  const openedAtRef = useRef(0)

  useEffect(() => {
    openedAtRef.current = Date.now()
  }, [])

  useEffect(() => {
    if (!eligible)
      return

    // The audience can resolve after the page opened: the card still shows 10 seconds after the page opened.
    const wait = Math.max(0, NUDGE_DELAY_MS - (Date.now() - openedAtRef.current))
    const timer = setTimeout(setShown, wait, true)

    return () => clearTimeout(timer)
  }, [eligible])

  if (!shown || !eligible)
    return null

  return (
    // Escape hides the card when focus is inside it, like its ×.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <aside
      aria-label={t('onboarding.nudge.title')}
      className="fixed top-[calc(env(safe-area-inset-top,0px)+12px)] z-40 ms-3 flex w-[calc(100%-1.5rem)] max-w-[calc(430px-1.5rem)] flex-col gap-3 rounded-2xl bg-surface p-3 shadow-overlay transition-[translate,opacity] duration-300 ease-out starting:-translate-y-4 starting:opacity-0 motion-reduce:transition-none"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          hideCard()
        }
      }}
    >
      <div className="flex items-center gap-3">
        <img alt="" className="size-11 shrink-0 rounded-xl object-cover" src={photoUrl('lake-steamboat')} />
        <p className="min-w-0 flex-1 font-serif text-[17px] leading-[22px] text-balance">{t('onboarding.nudge.title')}</p>
        <Button isIconOnly aria-label={t('onboarding.nudge.hide')} className="-me-1.5 size-11 shrink-0 self-start" variant="ghost" onPress={hideCard}>
          <CloseIcon size={18} />
        </Button>
      </div>
      <p className="-mt-1 text-label font-normal text-muted">{t('onboarding.nudge.description')}</p>
      <Button fullWidth className="h-11" onPress={() => openOnboarding('first')}>
        {t('onboarding.nudge.button')}
      </Button>
    </aside>
  )
}
