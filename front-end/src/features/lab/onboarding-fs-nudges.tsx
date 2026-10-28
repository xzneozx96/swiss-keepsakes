/**
 * Lab: the deep-link nudge (N24), slimmed on 28.10.2026 to a thin banner that floats under the
 * top edge while the visitor reads (a thin, easy-to-dismiss top banner, per the research the
 * owner accepted). It never enters the story's text flow and has no backdrop. Its button opens
 * the full-screen flow; the × and Escape only hide it for this visit.
 */
import type { Language } from '@/features/lab/onboarding-data'

import { Button } from '@heroui/react'

import { CloseIcon } from '@/components/icons'
import { fsCopy } from '@/features/lab/onboarding-fs-data'

/**
 * The banner while reading: drops in once the first paragraph has scrolled away, tucks away
 * while scrolling down and returns on scroll up. `shown` comes from the stage; while hidden
 * it is inert and aria-hidden. Under prefers-reduced-motion it appears and goes without sliding.
 */
export function NudgeBanner({
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
    // Escape hides the banner when focus is inside it, like its ×.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <aside
      aria-hidden={!shown}
      aria-label={f.nudgeTitle}
      className={`absolute inset-x-2 top-2 z-20 flex items-center gap-0.5 rounded-2xl bg-surface py-1 ps-3 pe-0.5 shadow-overlay transition-[translate,opacity] duration-300 ease-out motion-reduce:transition-none ${shown ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-[calc(100%+12px)] opacity-0'}`}
      data-nudge
      inert={!shown}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          onHide()
        }
      }}
    >
      <p className="min-w-0 flex-1 text-[14px] leading-[18px] font-medium text-balance">{f.nudgeTitle}</p>
      <Button
        className="h-auto min-h-11 max-w-[120px] shrink-0 px-2 py-1 text-[13px] leading-4 whitespace-normal"
        size="sm"
        onPress={onStart}
      >
        {f.nudgeStart}
      </Button>
      <Button isIconOnly aria-label={f.nudgeHide} className="size-11 shrink-0" variant="ghost" onPress={onHide}>
        <CloseIcon size={18} />
      </Button>
    </aside>
  )
}
