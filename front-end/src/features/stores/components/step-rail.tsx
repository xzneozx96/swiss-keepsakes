import type { StepId } from '../lib/onboarding-steps'

import { ProgressBar } from '@heroui/react'

import { CheckIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'

export interface RailStep {
  id: StepId
  title: string
  /** Words for the state, so it never rests on the tick alone. */
  note: string
  done: boolean
}

/** A step's mark: dashed while it is open, filled with a check once it is done. */
export function StepMark({ done }: { done: boolean }) {
  return done
    ? (
        <span aria-hidden className="flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
          <CheckIcon size={12} strokeWidth={3} />
        </span>
      )
    : <span aria-hidden className="size-5 shrink-0 rounded-full border-[1.5px] border-dashed border-foreground/40" />
}

/** The steps as a list, one button each. `met` of `total` conditions are done, with a bar. */
export function StepRail({ steps, current, met, total, onPick }: {
  steps: RailStep[]
  current: StepId
  met: number
  total: number
  onPick: (id: StepId) => void
}) {
  const { t } = useLocale()

  return (
    <nav aria-label={t('stores.setup.steps.label')} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-semibold">{t('stores.checklist.title')}</span>
          <span className="text-sm text-muted tabular-nums">{t('stores.checklist.count', { met, total })}</span>
        </div>
        <ProgressBar aria-label={t('stores.checklist.count', { met, total })} color="default" maxValue={total} size="sm" value={met}>
          <ProgressBar.Track>
            <ProgressBar.Fill />
          </ProgressBar.Track>
        </ProgressBar>
      </div>
      <ol className="flex flex-col gap-1">
        {steps.map(step => (
          <li key={step.id} data-step={step.id}>
            <button
              aria-current={step.id === current ? 'step' : undefined}
              className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 py-2 text-start text-sm outline-none hover:bg-default/60 focus-visible:focus-ring aria-[current=step]:bg-default aria-[current=step]:font-semibold"
              type="button"
              onClick={() => onPick(step.id)}
            >
              <StepMark done={step.done} />
              <span className="flex min-w-0 flex-col">
                <span className={step.done ? 'text-muted' : ''}>{step.title}</span>
                <span className="text-xs font-normal text-muted">{step.note}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  )
}
