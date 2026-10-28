/**
 * Lab: the deep-link nudge (N24): a card that floats under the top edge while the visitor
 * reads a story. It never enters the story's text flow and has no backdrop. Its button opens
 * the full-screen flow; the × and Escape only hide it for this visit. The card form was chosen
 * on 28.10.2026, tried as a thin banner the same day, and restored because the banner was
 * rejected.
 */
import type { Language } from '@/features/lab/onboarding-data'

import { Button } from '@heroui/react'

import { CloseIcon } from '@/components/icons'
import { fsCopy } from '@/features/lab/onboarding-fs-data'
import { photoUrl } from '@/lib/photos'

/**
 * The card while reading: drops in once the first paragraph has scrolled away, tucks away
 * while scrolling down and returns on scroll up. `shown` comes from the stage; while hidden it
 * is inert and aria-hidden. Under prefers-reduced-motion it appears and goes without sliding.
 */
export function NudgeCard({
  language,
  shown,
  onStart,
  onHide,
}: {
  language: Language
  shown: boolean
  onStart: () => void
  onHide: () => void
}) {
  const f = fsCopy[language]

  return (
    // Escape hides the card when focus is inside it, like its ×.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <aside
      aria-hidden={!shown}
      aria-label={f.nudgeTitle}
      className={`absolute inset-x-3 top-3 z-20 flex flex-col gap-3 rounded-2xl bg-surface p-3 shadow-overlay transition-[translate,opacity] duration-300 ease-out motion-reduce:transition-none ${shown ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-[calc(100%+16px)] opacity-0'}`}
      data-nudge
      inert={!shown}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          onHide()
        }
      }}
    >
      <div className="flex items-center gap-3">
        <img alt="" className="size-11 shrink-0 rounded-xl object-cover" src={photoUrl('lake-steamboat')} />
        <p className="min-w-0 flex-1 font-serif text-[17px] leading-[22px] text-balance">{f.nudgeTitle}</p>
        <Button isIconOnly aria-label={f.nudgeHide} className="-me-1.5 size-11 shrink-0 self-start" variant="ghost" onPress={onHide}>
          <CloseIcon size={18} />
        </Button>
      </div>
      <p className="-mt-1 text-label font-normal text-muted">{f.nudgeBody}</p>
      <Button fullWidth className="h-11" onPress={onStart}>
        {f.nudgeStart}
      </Button>
    </aside>
  )
}
