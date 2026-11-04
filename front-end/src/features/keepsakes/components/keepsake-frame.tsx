import type { EditorHeaderProps } from '@/components/layout/editor-header'
import type { StatusTone } from '@/components/status-chip'
import type { StepView } from '@/components/step-layout'

import { TrashIcon } from '@/components/icons'
import { EditorHeader } from '@/components/layout/editor-header'
import { StepLayout } from '@/components/step-layout'
import { useLocale } from '@/contexts/locale-context'
import { useIsWide } from '@/hooks/use-is-wide'

/**
 * The frame of the keepsake editor, new or saved: the shared editor header (Back, the name over "status · save state",
 * the compact switch, the step arrows, the red action and Delete), the step list on the left and the step's blocks on
 * the right. On phones the full switch opens the page. `onBack` is the leave guard: Back asks first when something is
 * not saved.
 */
export function KeepsakeFrame({ title, status, steps, current, canGo, onGo, onBack, onRemove, header, notices, languageSwitch, children }: {
  title: string
  status: { tone: StatusTone, label: string }
  steps: StepView[]
  current: string
  canGo: (id: string) => boolean
  onGo: (id: string) => void
  onBack: () => void
  /** Delete, as the header's one secondary action. Left out for a keepsake that is not saved yet. */
  onRemove?: () => void
  /** What the header says and offers for the open step: the save state, the arrows and the red action. */
  header: Pick<EditorHeaderProps, 'save' | 'steps' | 'primary'>
  /** What sits above the steps: the stale warning, a refused save. */
  notices?: React.ReactNode
  /** The editor's one EN/DE switch: it chooses the version of every step. Compact in the header, full on phones. */
  languageSwitch: (compact: boolean) => React.ReactNode
  children: React.ReactNode
}) {
  const { t } = useLocale()
  const isWide = useIsWide()

  return (
    <div className="flex min-w-0 flex-col gap-5" data-testid="keepsake-editor">
      <EditorHeader
        actions={onRemove ? [{ id: 'delete', label: t('keepsakes.remove.header'), icon: TrashIcon, isDanger: true }] : []}
        backLabel={t('keepsakes.back.toKeepsakes')}
        languageSwitch={languageSwitch(true)}
        status={{ tone: status.tone === 'info' ? 'neutral' : status.tone, label: status.label }}
        title={title}
        onAction={() => onRemove?.()}
        onBack={onBack}
        {...header}
      />
      {!isWide && languageSwitch(false)}
      {notices}
      <StepLayout canGo={canGo} current={current} quietTitle steps={steps} underHeader={header.steps ?? {}} onGo={onGo}>
        {children}
      </StepLayout>
    </div>
  )
}
