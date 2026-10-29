import type { IconComponent } from '@/components/icons'

import { Tabs } from '@heroui/react'

import { StatusDangerIcon, StatusNeutralIcon, StatusSuccessIcon, StatusWarningIcon } from '@/components/icons'
import { TabRow } from '@/components/page-tabs'

export type LanguageStatusTone = 'success' | 'warning' | 'muted' | 'danger'

export interface LanguageOption<Id extends string = string> {
  id: Id
  /** "English", "Deutsch". */
  label: string
  /** "EN", "DE": the label in a compact header. */
  short: string
}

export interface LanguageStatus {
  text: string
  tone: LanguageStatusTone
}

const toneIcon: Record<LanguageStatusTone, IconComponent> = {
  success: StatusSuccessIcon,
  warning: StatusWarningIcon,
  muted: StatusNeutralIcon,
  danger: StatusDangerIcon,
}

const toneText: Record<LanguageStatusTone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  muted: 'text-muted',
  danger: 'text-danger',
}

/** The status's icon: each tone has its own shape, so it never reads by colour alone. */
function StatusIcon({ status, size = 14 }: { status: LanguageStatus, size?: number }) {
  const Icon = toneIcon[status.tone]

  return <Icon aria-hidden className={`shrink-0 ${toneText[status.tone]}`} size={size} />
}

/**
 * Which language version is open, on the app's thin-pill tabs, with each version's state.
 * Knows nothing of stories or keepsakes: the caller maps its model to `status`. `compact`
 * is for a tight header (EN | DE, the status read out but not written).
 */
export function LanguageVersionSwitch<Id extends string>({
  label = 'Language version',
  languages,
  selected,
  onChange,
  status,
  compact = false,
}: {
  label?: string
  languages: readonly LanguageOption<Id>[]
  selected: Id
  onChange: (id: Id) => void
  status: Record<Id, LanguageStatus>
  compact?: boolean
}) {
  const current = languages.find(l => l.id === selected) ?? languages[0]!
  const name = (l: LanguageOption<Id>) => (compact ? l.short : l.label)

  return (
    <div className={`flex flex-col gap-1.5 ${compact ? 'shrink-0' : 'w-full'}`}>
      {/* Manual activation: the arrow keys only move the focus; Enter, Space or a tap chooses (choosing may start a version). */}
      <Tabs keyboardActivation="manual" selectedKey={selected} onSelectionChange={key => onChange(key as Id)}>
        <TabRow
          equal={!compact}
          label={label}
          tabs={languages.map(l => ({
            id: l.id,
            label: name(l),
            marker: (
              <span className="ms-1.5 inline-flex">
                <StatusIcon status={status[l.id]} />
                <span className="sr-only">{`, ${status[l.id].text}`}</span>
              </span>
            ),
          }))}
        />
      </Tabs>
      {!compact && (
        <p aria-hidden className="flex items-center gap-1.5 text-xs text-muted">
          <StatusIcon size={12} status={status[current.id]} />
          {`${current.label} · ${status[current.id].text}`}
        </p>
      )}
    </div>
  )
}
