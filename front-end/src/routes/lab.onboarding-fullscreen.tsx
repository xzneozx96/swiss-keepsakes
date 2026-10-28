import type { Language } from '@/features/lab/onboarding-data'
import type { Scenario } from '@/features/lab/onboarding-fs-data'

import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { useOnboardingFlow } from '@/features/lab/onboarding-data'
import { scenarios } from '@/features/lab/onboarding-fs-data'
import { OnboardingStage } from '@/features/lab/onboarding-fs-kit'
import { noIndexHead } from '@/lib/no-index'

/** Lab: the full-screen guest onboarding (N01, F1) and the deep-link nudge (N24) at phone width. */
export const Route = createFileRoute('/lab/onboarding-fullscreen')({
  ssr: false,
  head: noIndexHead,
  component: OnboardingFullscreenLab,
})

const chip
  = 'h-9 rounded-full border border-separator bg-surface px-3.5 text-sm font-medium outline-none focus-visible:focus-ring aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background'

function OnboardingFullscreenLab() {
  const locale = useLocale()
  const flow = useOnboardingFlow()
  const [scenario, setScenario] = useState<Scenario>('home')
  const [language, setLanguage] = useState<Language>(locale.language)
  const [run, setRun] = useState(0)
  const current = scenarios.find(s => s.id === scenario) ?? scenarios[0]!

  /** Every switch starts that visitor afresh. */
  const start = (next: Scenario) => {
    flow.reset(next === 'returning')
    setScenario(next)
    setRun(r => r + 1)
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-6 bg-default/40 py-6 lg:flex-row lg:items-start lg:justify-center lg:gap-10">
      <div className="flex w-full max-w-[420px] flex-col gap-4 px-4">
        <Link className="self-start text-label text-muted underline underline-offset-4" to="/lab">
          Lab
        </Link>
        <div className="flex flex-col gap-1">
          <h1 className="text-heading">Onboarding (N01) and nudge (N24)</h1>
          <p className="text-sm text-muted">
            F1 Guided, the chosen full-screen flow for a guest’s first visit to the home, and
            the card that floats in while a guest who arrived by a link reads. Pick a
            visitor to see who gets the flow, who gets only the card, and who gets nothing.
            Nothing is saved.
          </p>
        </div>

        <Group label="Visitor (restarts the phone)">
          <div className="flex w-full flex-col gap-1.5">
            {scenarios.map(s => (
              <button
                key={s.id}
                aria-pressed={scenario === s.id}
                className={`${chip} h-auto min-h-9 py-1.5 text-start`}
                type="button"
                onClick={() => start(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
          <p className="rounded-2xl bg-surface px-3 py-2 text-sm">
            <span className="font-medium">Expect: </span>
            {current.expect}
          </p>
        </Group>

        <Group label="Language">
          {(['en', 'de'] as const).map(l => (
            <button
              key={l}
              aria-pressed={language === l}
              className={chip}
              type="button"
              onClick={() => setLanguage(l)}
            >
              {l.toUpperCase()}
            </button>
          ))}
          <button className={chip} type="button" onClick={() => start(scenario)}>
            Restart this visitor
          </button>
        </Group>

        <p className="rounded-2xl bg-surface p-4 text-label text-muted shadow-surface">
          Step 1: Skip moves on to step 2 without saving a stay; the × and Escape close the flow
          with nothing saved. Step 2: Skip, × and Escape close it and keep the stay. Any close is
          final. When changing answers, × keeps what was changed. Afterwards the list re-sorts as the screen lifts (AC38 fixture: with “Just
          today” and Food, A leads and B is last). “Change” above the list and Account → Your
          trip reopen the same screens, pre-filled.
        </p>
      </div>

      <div className="flex w-full justify-center sm:w-auto">
        <OnboardingStage
          key={`${scenario}-${run}`}
          flow={flow}
          language={language}
          scenario={scenario}
        />
      </div>
    </div>
  )
}

function Group({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div aria-label={label} className="flex flex-wrap items-center gap-2" role="group">
      <span className="w-full text-label text-muted">{label}</span>
      {children}
    </div>
  )
}
