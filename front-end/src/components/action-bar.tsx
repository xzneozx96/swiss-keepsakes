import type { IconComponent } from '@/components/icons'

import { Button } from '@heroui/react'
import { useEffect } from 'react'

import { CloseIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'

export interface ActionBarAction {
  icon: IconComponent
  /** Shown beside the icon from `sm` up; on a phone only the icon shows and this is the accessible name. */
  label: string
  /** The accessible name when it says more than the label ("Delete 2"). */
  ariaLabel?: string
  onPress: () => void
  /** `danger` is the app's destructive style (danger-soft). */
  tone?: 'danger'
  isPending?: boolean
  isDisabled?: boolean
}

export interface ActionBarProps {
  count: number
  onClear: () => void
  actions: ActionBarAction[]
  /** A short caption above the bar, e.g. "2 in use, kept". */
  note?: string
}

// The ghost button's text is dark by default; on this dark surface it has to be the page colour.
const GHOST = 'h-11 min-w-11 gap-1.5 px-3 [--button-bg-hover:color-mix(in_srgb,var(--background)_16%,transparent)] [--button-fg:var(--background)] sm:h-9'
const DANGER = 'h-11 min-w-11 gap-1.5 px-3 sm:h-9'

/**
 * The floating bar of a list with bulk selection: count, actions, close. It sits centred at the bottom of
 * the content, above the phone bottom nav. Esc clears the selection.
 */
export function ActionBar({ count, onClear, actions, note }: ActionBarProps) {
  const { t } = useLocale()

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented && !document.querySelector('[role="dialog"], [role="alertdialog"]'))
        onClear()
    }

    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClear])

  return (
    <div className="pointer-events-none sticky bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] z-10 flex flex-col items-center gap-2 lg:bottom-4" data-testid="action-bar">
      {note && <p className="pointer-events-auto rounded-full bg-foreground px-3 py-1 text-xs text-background/80">{note}</p>}
      <div
        className="pointer-events-auto flex max-w-full items-center gap-1 rounded-full border border-background/15 bg-foreground p-1.5 text-background shadow-overlay"
        role="toolbar"
      >
        <span aria-live="polite" className="flex shrink-0 items-center gap-2 ps-1.5 pe-1">
          <span aria-hidden className="flex size-7 items-center justify-center rounded-full bg-background text-sm font-semibold text-foreground tabular-nums">{count}</span>
          <span className="sr-only">{t('actionBar.count', { count })}</span>
        </span>
        <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-background/25" />
        {actions.map(({ icon: Icon, label, ariaLabel, onPress, tone, isPending, isDisabled }) => (
          <Button
            key={label}
            aria-label={ariaLabel ?? label}
            className={tone === 'danger' ? DANGER : GHOST}
            isDisabled={isDisabled}
            isPending={isPending}
            size="sm"
            variant={tone === 'danger' ? 'danger-soft' : 'ghost'}
            onPress={onPress}
          >
            {({ isPending: pending }) => (
              <>
                {!pending && <Icon aria-hidden size={16} />}
                <span className="max-sm:sr-only">{label}</span>
              </>
            )}
          </Button>
        ))}
        <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-background/25" />
        <Button
          isIconOnly
          aria-label={t('actionBar.clear')}
          className={GHOST}
          size="sm"
          variant="ghost"
          onPress={onClear}
        >
          <CloseIcon aria-hidden size={16} />
        </Button>
      </div>
    </div>
  )
}
