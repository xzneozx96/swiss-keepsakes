import type { StatusTone } from '@/components/status-chip'
import type { StepView } from '@/components/step-layout'

import { Button } from '@heroui/react'

import { BackIcon } from '@/components/icons'
import { MerchantBackBar } from '@/components/layout/merchant-back-bar'
import { StatusChip } from '@/components/status-chip'
import { StepBar } from '@/components/step-bar'
import { StepLayout } from '@/components/step-layout'
import { useLocale } from '@/contexts/locale-context'
import { KEEPSAKES_PATH } from '../lib/search-params'

/**
 * The frame of the keepsake editor, new or saved, laid out like the place editor: a header with the back arrow, the
 * name and the status chip, the step list on the left, the step's blocks on the right and the bar under them.
 * `onBack` is the leave guard: the arrow asks first when something is not saved.
 */
export function KeepsakeFrame({ title, status, steps, current, canGo, onGo, onBack, onRemove, bar, notices, languageSwitch, children }: {
  title: string
  status: { tone: StatusTone, label: string }
  steps: StepView[]
  current: string
  canGo: (id: string) => boolean
  onGo: (id: string) => void
  onBack: () => void
  /** Delete, in the bar under the steps of a saved keepsake. Left out for a keepsake that is not saved yet. */
  onRemove?: () => void
  bar: React.ComponentProps<typeof StepBar>
  /** What sits above the steps: the stale warning, a refused save. */
  notices?: React.ReactNode
  /** The editor's one EN/DE switch, by the title: it chooses the version of every step. */
  languageSwitch: React.ReactNode
  children: React.ReactNode
}) {
  const { t } = useLocale()

  return (
    <div className="flex min-w-0 flex-col gap-5" data-testid="keepsake-editor">
      <MerchantBackBar
        label={t('keepsakes.back.toKeepsakes')}
        status={<StatusChip tone={status.tone}>{status.label}</StatusChip>}
        title={title}
        to={KEEPSAKES_PATH as never}
        onClick={(event) => {
          event.preventDefault()
          onBack()
        }}
      />
      {/* On phones the ← bar shows the title and the status; the header stays for screen readers only. */}
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:gap-6">
        <header className="flex min-w-0 items-center gap-3 max-lg:sr-only lg:flex-1">
          <Button isIconOnly aria-label={t('keepsakes.back.toKeepsakes')} className="-ms-2 hidden shrink-0 lg:inline-flex" variant="tertiary" onPress={onBack}>
            <BackIcon aria-hidden size={20} />
          </Button>
          <h1 className="min-w-0 text-title text-pretty [overflow-wrap:anywhere] max-lg:sr-only">{title}</h1>
          <span className="shrink-0 max-lg:hidden" data-testid="keepsake-status">
            <StatusChip tone={status.tone}>{status.label}</StatusChip>
          </span>
        </header>
        <div className="min-w-0 lg:w-80 lg:shrink-0">{languageSwitch}</div>
      </div>
      {notices}
      <StepLayout barInFlow canGo={canGo} current={current} quietTitle steps={steps} onGo={onGo}>
        {children}
        <StepBar {...bar} inline destructive={onRemove && { label: t('keepsakes.remove.action'), onPress: onRemove }} />
      </StepLayout>
    </div>
  )
}
