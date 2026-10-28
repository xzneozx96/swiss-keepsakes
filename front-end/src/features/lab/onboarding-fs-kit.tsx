/**
 * Lab kit for the full-screen guest onboarding (N01): the blocking dialog shell, the "Sorted
 * for … Change" line and the stage that applies the owner's rule matrix around the phone frame
 * of `onboarding-kit.tsx`, with the deep-link nudge (N24). Design only: state is local.
 */
import type { Answers, Flow, Language } from '@/features/lab/onboarding-data'
import type { EndAction, Scenario, Step } from '@/features/lab/onboarding-fs-data'

import { Button } from '@heroui/react'
import { useEffect, useId, useLayoutEffect, useState } from 'react'

import { answerSummary, copy } from '@/features/lab/onboarding-data'
import { closeAction } from '@/features/lab/onboarding-fs-data'
import { NudgeCard } from '@/features/lab/onboarding-fs-nudges'
import { FullscreenGuided } from '@/features/lab/onboarding-fs-options'
import { PhoneFrame } from '@/features/lab/onboarding-kit'

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * The blocking surface: a modal dialog over the whole phone frame, tab bar included. The
 * frame behind it is `inert` (set by the stage). It rises like a sheet and drops away. Focus
 * goes to the step heading on open and on every step, Tab stays inside, Escape does what the
 * × does (`closeAction`), and focus returns where it was.
 * Product note: the real app should use HeroUI's Modal; this one stays inside the lab frame.
 */
function FullscreenDialog({
  step,
  editing,
  titleId,
  onClose,
  children,
}: {
  step: Step
  editing: boolean
  titleId: string
  onClose: (action: EndAction) => void
  children: (end: (action: EndAction) => void) => React.ReactNode
}) {
  const dialogId = useId()
  const [closing, setClosing] = useState(false)
  const [returnTo] = useState(() => document.activeElement as HTMLElement | null)

  useLayoutEffect(() => {
    if (!reducedMotion()) {
      document.getElementById(dialogId)?.animate(
        [{ translate: '0 40px', opacity: 0 }, { translate: '0 0', opacity: 1 }],
        { duration: 360, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' },
      )
    }
  }, [dialogId])

  useEffect(() => {
    document.getElementById(titleId)?.focus()
  }, [step, titleId])

  useEffect(() => () => {
    const fallback = document.querySelector<HTMLElement>('[data-onboarding-return]')
    const target = returnTo?.isConnected && returnTo !== document.body ? returnTo : fallback

    target?.focus()
  }, [returnTo])

  async function end(action: EndAction) {
    if (closing)
      return
    setClosing(true)
    const element = document.getElementById(dialogId)

    if (element && !reducedMotion()) {
      await element.animate([{ translate: '0 0' }, { translate: '0 100%' }], {
        duration: 420,
        easing: 'cubic-bezier(0.5, 0, 0.75, 0)',
        fill: 'forwards',
      }).finished
    }
    onClose(action)
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      void end(closeAction(step, editing))

      return
    }
    if (event.key !== 'Tab')
      return
    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), [href], [tabindex="0"]'),
    )
    const first = focusable[0]
    const last = focusable.at(-1)

    if (event.shiftKey && (document.activeElement === first || document.activeElement?.id === titleId)) {
      event.preventDefault()
      last?.focus()
    }
    else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }

  return (
    // The dialog pattern: Escape and the Tab wrap are handled for everything inside it.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      aria-labelledby={titleId}
      aria-modal
      className={`absolute inset-0 z-40 overflow-hidden rounded-[28px] bg-background ${closing ? 'pointer-events-none' : ''}`}
      id={dialogId}
      role="dialog"
      onKeyDown={onKeyDown}
    >
      {children(end)}
    </div>
  )
}

/** The quiet line above the list (from the earlier option A): the way back in. */
function SortedLine({ answers, language, onChange }: { answers: Answers, language: Language, onChange: () => void }) {
  const c = copy[language]
  const summary = answerSummary(answers, language)

  return (
    <div className="-mt-1 flex animate-rise items-center justify-between gap-2 rounded-2xl bg-surface-secondary py-1 ps-3 pe-1">
      <p className="min-w-0 text-label">
        {summary
          ? (
              <>
                <span className="text-muted">
                  {c.sortedFor}
                  {': '}
                </span>
                {summary}
              </>
            )
          : <span className="text-muted">{c.newest}</span>}
      </p>
      <Button className="shrink-0" data-onboarding-return size="sm" variant="ghost" onPress={onChange}>
        {summary ? c.change : c.personalise}
      </Button>
    </div>
  )
}

/** Lab-only marker inside the frame: how the visitor arrived. Dashed so it never reads as UI. */
function LabNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="mx-4 mt-3 rounded-2xl border border-dashed border-field-border bg-surface-secondary px-3 py-2 text-label text-muted">
      {children}
    </p>
  )
}

const arrival: Partial<Record<Scenario, string>> = {
  story: 'Lab: opened from a link to a story',
  qr: 'Lab: opened from a partner’s QR code (a story here)',
  staff: 'Lab: signed in as store owner or partner',
}

/** How long after a story opens the nudge card appears (the owner asked for 10 s on 2026-10-28). */
export const NUDGE_DELAY_MS = 10_000

/**
 * One visitor. The rules: the full-screen flow opens by itself only for an unanswered guest on
 * Explore; a story deep link shows the nudge card instead (only on a story page, 10 s after
 * it opens) and the flow waits for the first tap on Explore. Hiding the nudge is for this visit only; closing the flow is final.
 * Signed-in staff never see any of it.
 */
export function OnboardingStage({
  flow,
  language,
  scenario,
}: {
  flow: Flow
  language: Language
  scenario: Scenario
}) {
  const guest = scenario !== 'staff'
  const deepLink = scenario === 'story' || scenario === 'qr'
  const titleId = useId()
  const [page, setPage] = useState<'home' | 'story'>(deepLink ? 'story' : 'home')
  const [tab, setTab] = useState<'explore' | 'account'>('explore')
  const [open, setOpen] = useState(scenario === 'home')
  const [step, setStep] = useState<Step>(1)
  const [nudgeHidden, setNudgeHidden] = useState(false)
  const [cardShown, setCardShown] = useState(false)
  // The list keeps the order it had when the flow opened, so the re-rank plays as it lifts.
  const [answersAtOpen, setAnswersAtOpen] = useState(flow.answers)
  const asking = flow.phase === 'step1' || flow.phase === 'step2'
  const editing = flow.phase === 'editing'
  const shown = { ...flow, answers: open ? answersAtOpen : flow.answers }
  const showNudge = guest && asking && page === 'story' && tab === 'explore' && !nudgeHidden

  const openFlow = () => {
    setAnswersAtOpen(flow.answers)
    setStep(1)
    setOpen(true)
  }

  const reopen = () => {
    setTab('explore')
    setPage('home')
    flow.edit()
    openFlow()
  }

  const close = (action: EndAction) => {
    if (action === 'forget')
      flow.forget()
    else if (action === 'skip-interests')
      flow.skipInterests()
    else
      flow.finish()
    setOpen(false)
  }

  const onTab = (next: 'explore' | 'account') => {
    setTab(next)
    if (next !== 'explore')
      return
    setPage('home')
    if (guest && asking)
      openFlow()
  }

  // The card appears NUDGE_DELAY_MS after the story opens and stays until it is hidden or the
  // visitor leaves the story. No scroll logic: the timer is the only trigger.
  useEffect(() => {
    if (!showNudge)
      return
    const timer = window.setTimeout(setCardShown, NUDGE_DELAY_MS, true)

    return () => window.clearTimeout(timer)
  }, [showNudge])

  return (
    <div className="relative h-[740px] w-[375px] max-w-full">
      <div className="h-full" inert={open}>
        <PhoneFrame
          accountTrip={guest ? reopen : () => {}}
          dock={showNudge && (
            <NudgeCard
              language={language}
              shown={cardShown}
              onHide={() => setNudgeHidden(true)}
              onStart={openFlow}
            />
          )}
          flow={shown}
          language={language}
          listHeader={guest && !asking && !open && (
            <SortedLine answers={flow.answers} language={language} onChange={reopen} />
          )}
          page={page}
          tab={tab}
          top={arrival[scenario] && (page === 'story' || !guest)
            ? <LabNote>{arrival[scenario]}</LabNote>
            : undefined}
          onTab={onTab}
        />
      </div>
      {open && (
        <FullscreenDialog
          editing={editing}
          step={step}
          titleId={titleId}
          onClose={close}
        >
          {end => (
            <FullscreenGuided
              editing={editing}
              end={end}
              flow={flow}
              language={language}
              setStep={setStep}
              step={step}
              titleId={titleId}
            />
          )}
        </FullscreenDialog>
      )}
    </div>
  )
}
