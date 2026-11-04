import type { IconComponent } from '@/components/icons'
import type { StatusTextTone } from '@/components/status-text'

import { Button, Tooltip } from '@heroui/react'

import { ArrowRightIcon, BackIcon, StatusSuccessIcon } from '@/components/icons'
import { BAR_PULL_UP, BAR_TOP } from '@/components/layout/notice-aware-bar'
import { RowActions } from '@/components/row-actions'
import { StatusText } from '@/components/status-text'
import { useLocale } from '@/contexts/locale-context'

export interface EditorHeaderAction {
  id: string
  label: string
  icon: IconComponent
  /** Delete, archive: the danger tone. */
  isDanger?: boolean
  isDisabled?: boolean
}

export interface EditorHeaderButton {
  label: string
  /** The phone label when the full one does not fit ("Review" for "Review and publish"). */
  shortLabel?: string
  onPress: () => void
  isDisabled?: boolean
}

export interface EditorHeaderProps {
  backLabel: string
  /** The editor's leave guard decides whether Back leaves at once or asks first. */
  onBack: () => void
  title: string
  /** The status of what is open, as dot text ("● Published"). */
  status?: { tone: StatusTextTone, label: string }
  /**
   * The save state, the same line for both save models: "Saved 10:07" (autosave, a tick), "No changes" or "Unsaved
   * changes" (explicit save), or what a review step says instead.
   */
  save?: { text: string, tone: 'muted' | 'warning' | 'danger' | 'success' }
  /** The compact language switch, shown from 1024 px; on phones the editor shows the full one on the page. */
  languageSwitch?: React.ReactNode
  /** Previous and next step, from 1024 px (phones use the step line). A missing handler turns its arrow off. */
  steps?: { onPrevious?: () => void, onNext?: () => void }
  /** A quiet second action beside the red one (Save draft). */
  secondary?: EditorHeaderButton
  /** The screen's one red action: Review and publish (autosave), Save changes (explicit, off while nothing changed), Next or Publish. */
  primary?: EditorHeaderButton
  /** One action shows as its own icon button with a tooltip; two or more sit in the ⋯ menu. */
  actions?: EditorHeaderAction[]
  onAction?: (id: string) => void
  /** The ⋯ menu's name, with two or more actions ("More actions for Classic SD"). */
  moreLabel?: string
}

// One size for the bar's buttons at every width (owner, 04.11.2026): HeroUI's buttons grow below 768 px otherwise.
const BUTTON = 'h-9'
const ICON_BUTTON = 'size-9'

const saveTone = { muted: 'text-muted', warning: 'font-medium text-warning', danger: 'font-medium text-danger', success: 'text-muted' } as const

function Rule() {
  return <span aria-hidden className="h-6 w-px shrink-0 bg-separator max-lg:hidden" />
}

function ButtonLabel({ button }: { button: EditorHeaderButton }) {
  if (!button.shortLabel)
    return button.label

  return (
    <>
      <span className="lg:hidden">{button.shortLabel}</span>
      <span className="max-lg:hidden">{button.label}</span>
    </>
  )
}

function SecondaryActions({ actions, moreLabel, onAction }: Pick<EditorHeaderProps, 'moreLabel' | 'onAction'> & { actions: EditorHeaderAction[] }) {
  const [only] = actions

  if (actions.length === 1 && only) {
    return (
      <Tooltip delay={300}>
        <Button isIconOnly aria-label={only.label} className={`shrink-0 ${ICON_BUTTON}`} isDisabled={only.isDisabled} size="sm" variant={only.isDanger ? 'danger-soft' : 'tertiary'} onPress={() => onAction?.(only.id)}>
          <only.icon aria-hidden size={18} />
        </Button>
        <Tooltip.Content placement="bottom">
          <p>{only.label}</p>
        </Tooltip.Content>
      </Tooltip>
    )
  }

  return <RowActions actions={actions} label={moreLabel ?? ''} triggerClassName={ICON_BUTTON} onAction={onAction} />
}

/**
 * The one header of every merchant editor (owner, 04.11.2026, option A): Back, the name over one line "status · save
 * state", then the language switch, the step arrows, the one red action and the secondary actions in a row. It pins
 * to the top of the page and, from 1024 px, under the store notice; it bleeds out of the merchant shell's padding.
 */
export function EditorHeader({ backLabel, onBack, title, status, save, languageSwitch, steps, secondary, primary, actions = [], onAction, moreLabel }: EditorHeaderProps) {
  const { t } = useLocale()

  return (
    <div className={`sticky ${BAR_TOP} z-30 -mx-4 border-b border-separator bg-background/90 backdrop-blur-xl lg:-mx-8 ${BAR_PULL_UP}`} data-editor-header="">
      <div className="flex h-16 items-center gap-1.5 px-2 lg:gap-3 lg:px-6">
        <Button isIconOnly aria-label={backLabel} className="size-11 shrink-0" variant="ghost" onPress={onBack}>
          <BackIcon aria-hidden size={20} />
        </Button>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-tight">
          <h1 className="truncate text-[15px] font-semibold lg:text-base" title={title}>{title}</h1>
          {(status || save) && (
            <span className="flex min-w-0 items-center gap-1.5">
              {status && <StatusText tone={status.tone}>{status.label}</StatusText>}
              {status && save && <span aria-hidden className="text-xs text-muted">·</span>}
              {save && (
                <span aria-live="polite" className={`flex min-w-0 items-center gap-1 text-xs whitespace-nowrap lg:text-sm ${saveTone[save.tone]}`} role="status">
                  {save.tone === 'success' && <StatusSuccessIcon aria-hidden className="shrink-0 text-success" size={14} />}
                  <span className="truncate">{save.text}</span>
                </span>
              )}
            </span>
          )}
        </div>
        {languageSwitch && <div className="shrink-0 max-lg:hidden">{languageSwitch}</div>}
        {steps && (
          <>
            {languageSwitch && <Rule />}
            <span className="flex shrink-0 items-center gap-1 max-lg:hidden">
              <Button isIconOnly aria-label={t('steps.back')} className={ICON_BUTTON} isDisabled={!steps.onPrevious} size="sm" variant="tertiary" onPress={steps.onPrevious}>
                <BackIcon aria-hidden size={18} />
              </Button>
              <Button isIconOnly aria-label={t('steps.next')} className={ICON_BUTTON} isDisabled={!steps.onNext} size="sm" variant="tertiary" onPress={steps.onNext}>
                <ArrowRightIcon aria-hidden size={18} />
              </Button>
            </span>
          </>
        )}
        {(secondary || primary) && (languageSwitch || steps) && <Rule />}
        {secondary && (
          <Button aria-label={secondary.label} className={`shrink-0 ${BUTTON}`} isDisabled={secondary.isDisabled} variant="tertiary" onPress={secondary.onPress}>
            <ButtonLabel button={secondary} />
          </Button>
        )}
        {primary && (
          <Button aria-label={primary.label} className={`shrink-0 ${BUTTON}`} isDisabled={primary.isDisabled} onPress={primary.onPress}>
            <ButtonLabel button={primary} />
          </Button>
        )}
        {actions.length > 0 && <SecondaryActions actions={actions} moreLabel={moreLabel} onAction={onAction} />}
      </div>
    </div>
  )
}
