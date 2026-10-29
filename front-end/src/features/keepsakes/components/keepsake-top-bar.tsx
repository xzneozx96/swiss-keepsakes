import type { Product } from '@sk/api-contract'
import type { SaveState } from '../hooks/use-keepsake-editor'

import { Button } from '@heroui/react'

import { BackIcon, StatusSuccessIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { statusOf } from '../lib/keepsake-rules'
import { StatusText } from './status-text'

/** Autosave's state as M17 says it: unsaved edits, saving, or the time of the last save. */
function SaveStatus({ state, savedAt }: { state: SaveState, savedAt: Date }) {
  const { t, intlLocale } = useLocale()
  const text = state === 'saving'
    ? t('keepsakes.save.saving')
    : state === 'unsaved'
      ? t('keepsakes.save.unsaved')
      : state === 'saved'
        ? t('keepsakes.save.saved', { time: savedAt.toLocaleTimeString(intlLocale, { hour: '2-digit', minute: '2-digit' }) })
        : t('keepsakes.save.notSaved')

  return (
    <span aria-live="polite" className={`flex min-w-0 items-center gap-1.5 truncate text-xs whitespace-nowrap lg:text-sm ${state === 'unsaved' || state === 'stale' || state === 'failed' ? 'font-medium text-warning' : 'text-muted'}`} role="status">
      {state !== 'saved' && state !== 'saving' && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {state === 'saved' && <StatusSuccessIcon aria-hidden className="text-success" size={14} />}
      {text}
    </span>
  )
}

/**
 * The sticky bar of the keepsake page: the 44 px back arrow, the name on one line over the status and the save state,
 * and the screen's action. The status is the only place that shows it, as text with a dot.
 */
export function KeepsakeTopBar({ keepsake, name, state, savedAt, backLabel, onBack, children }: {
  keepsake: Product
  name: string
  state: SaveState
  savedAt: Date
  backLabel: string
  onBack: () => void
  children?: React.ReactNode
}) {
  const { t } = useLocale()
  const status = statusOf(keepsake)

  return (
    <div className="sticky top-0 z-30 -mx-4 -mt-4 border-b border-separator bg-background/95 backdrop-blur lg:-mx-8 lg:-mt-8">
      <div className="flex min-h-16 items-center gap-2 px-2 py-2 lg:gap-3 lg:px-8">
        <Button isIconOnly aria-label={backLabel} className="size-11 shrink-0" variant="ghost" onPress={onBack}>
          <BackIcon aria-hidden size={20} />
        </Button>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h1 className="truncate text-sm font-semibold lg:text-base" title={name}>{name}</h1>
          <div className="flex min-w-0 items-center gap-1.5">
            <StatusText tone={status.tone}>{t(status.key)}</StatusText>
            <span aria-hidden className="text-xs text-muted">·</span>
            <SaveStatus savedAt={savedAt} state={state} />
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
