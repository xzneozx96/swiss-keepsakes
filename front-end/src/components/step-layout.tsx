import type { MissingText, StepStatus } from '@sk/domain/catalog'

import { Button, ProgressBar } from '@heroui/react'

import { useState } from 'react'

import { SheetFrame } from '@/components/sheet-frame'
import { StepLine, StepMark, StepStatusText } from '@/components/step-marks'
import { useLocale } from '@/contexts/locale-context'

/** The status word of a step that is not the one being edited. */
const stepStatusKey = {
  done: 'steps.status.done',
  error: 'steps.status.error',
  warning: 'steps.status.warning',
  todo: 'steps.status.todo',
} as const

export interface StepView {
  id: string
  label: string
  status: StepStatus
  /** The step's text fields per language; absent for a step without text (no switch). Only the tour and gift step body reads it. */
  missing?: MissingText
}

/**
 * The stepper's frame (owner, revision 2). From 1024px: the steps as a vertical numbered list
 * in a sticky left column, with the step's title, fields and bar on the right. Phones: "Step 2
 * of 6 · Options & stock", an ink progress bar and "All steps", a sheet listing them.
 * While creating, only the steps already reached can be opened.
 */
export function StepLayout({
  steps,
  current,
  canGo,
  onGo,
  children,
  quietTitle = false,
}: {
  steps: StepView[]
  current: string
  canGo: (id: string) => boolean
  onGo: (id: string) => void
  children: React.ReactNode
  /** From 1024px the step list already names the step, so its title is kept for screen readers only. */
  quietTitle?: boolean
}) {
  const { t } = useLocale()
  const [sheetOpen, setSheetOpen] = useState(false)
  const index = steps.findIndex(s => s.id === current)
  const step = steps[index]
  const srStatus = (s: StepView) =>
    s.status === 'todo' ? '' : `, ${t(stepStatusKey[s.status])}`

  return (
    <div className="flex min-w-0 flex-col gap-5 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start lg:gap-8">
      <nav
        aria-label={t('steps.label')}
        className="sticky top-6 hidden lg:block"
      >
        <ol className="flex flex-col">
          {steps.map((s, i) => {
            const isCurrent = s.id === current

            return (
              <li key={s.id} className="relative pb-2 last:pb-0">
                {/* The connector runs from under this number to the next one. */}
                {i < steps.length - 1 && (
                  <StepLine
                    className="start-[1.3125rem] top-[2.625rem] -bottom-1"
                    isCurrent={isCurrent}
                    status={s.status}
                  />
                )}
                <button
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-label={`${i + 1}. ${s.label}${srStatus(s)}`}
                  className={`flex w-full min-w-0 items-start gap-3 rounded-2xl p-1.5 text-start outline-none enabled:hover:bg-surface-secondary focus-visible:focus-ring disabled:cursor-default ${isCurrent ? 'bg-surface-secondary' : ''}`}
                  disabled={!canGo(s.id) || isCurrent}
                  type="button"
                  onClick={() => onGo(s.id)}
                >
                  <StepMark index={i} isCurrent={isCurrent} status={s.status} />
                  <span className="flex min-w-0 flex-col pt-1">
                    <span
                      className={`text-sm break-words hyphens-auto ${isCurrent ? 'font-semibold text-foreground' : canGo(s.id) ? 'text-foreground' : 'text-muted'}`}
                    >
                      {s.label}
                    </span>
                    <StepStatusText isCurrent={isCurrent} status={s.status} />
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </nav>
      <div className="flex min-w-0 flex-col gap-5 pb-20 lg:gap-6 lg:pb-0">
        {sheetOpen && (
          <SheetFrame
            isOpen
            footer={(
              <Button
                fullWidth
                variant="tertiary"
                onPress={() => setSheetOpen(false)}
              >
                {t('merchantOrder.sheet.close')}
              </Button>
            )}
            title={t('steps.title')}
            onClose={() => setSheetOpen(false)}
          >
            <ol className="flex flex-col">
              {steps.map((s, i) => {
                const isCurrent = s.id === current

                return (
                  <li key={s.id} className="relative">
                    {i < steps.length - 1 && (
                      <StepLine
                        className="start-[1.4375rem] top-[2.75rem] -bottom-1.5"
                        isCurrent={isCurrent}
                        status={s.status}
                      />
                    )}
                    <button
                      aria-current={isCurrent ? 'step' : undefined}
                      className="flex min-h-12 w-full items-start gap-3 rounded-2xl p-2 text-start outline-none enabled:hover:bg-surface-secondary focus-visible:focus-ring disabled:opacity-60"
                      disabled={!canGo(s.id)}
                      type="button"
                      onClick={() => {
                        setSheetOpen(false)
                        onGo(s.id)
                      }}
                    >
                      <StepMark
                        index={i}
                        isCurrent={isCurrent}
                        status={s.status}
                      />
                      <span className="flex min-w-0 flex-1 flex-col pt-1">
                        <span className={isCurrent ? 'font-semibold' : ''}>
                          {s.label}
                        </span>
                        <StepStatusText
                          isCurrent={isCurrent}
                          status={s.status}
                        />
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </SheetFrame>
        )}
        {/* The step's own title: on phones with its number, as the owner's "Step 2 of 6 · …",
          beside "All steps", with an ink progress bar under it. */}
        <div className={`flex flex-col gap-3 ${quietTitle ? 'lg:contents' : ''}`}>
          <div className={`flex items-center justify-between gap-3 ${quietTitle ? 'lg:contents' : ''}`}>
            <h2 className={`min-w-0 text-heading ${quietTitle ? 'lg:sr-only' : ''}`} id="step-title">
              <span className="lg:hidden">
                {t('steps.of', { n: index + 1, total: steps.length })}
                {' '}
                ·
                {' '}
              </span>
              {step?.label}
            </h2>
            <Button
              className="shrink-0 lg:hidden"
              size="sm"
              variant="tertiary"
              onPress={() => setSheetOpen(true)}
            >
              {t('steps.all')}
            </Button>
          </div>
          <ProgressBar
            aria-label={t('steps.progress')}
            className="w-full lg:hidden"
            color="default"
            maxValue={steps.length}
            size="sm"
            value={index + 1}
          >
            <ProgressBar.Track>
              <ProgressBar.Fill />
            </ProgressBar.Track>
          </ProgressBar>
        </div>
        {children}
      </div>
    </div>
  )
}
