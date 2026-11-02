import { Button } from '@heroui/react'

import { useEffect, useState } from 'react'

import { ArrowRightIcon, BackIcon, StatusSuccessIcon, TrashIcon } from '@/components/icons'

import { useLocale } from '@/contexts/locale-context'

const FORM_FIELD_TAG = /^(?:input|textarea|select)$/i

export interface BarAction {
  label: string
  onPress: () => void
  /** The action cannot run now, for a reason the page already says (a publish that checks block). */
  isDisabled?: boolean
}

/**
 * True while a text field has focus and the on-screen keyboard has shrunk the visible area.
 * Browsers that resize the layout for the keyboard would lift a fixed bar over the focused
 * field, so the phone bar steps aside until the field loses focus.
 */
function useKeyboardOpen() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const viewport = window.visualViewport
    const isField = (el: Element | null) =>
      el instanceof HTMLElement
      && (el.isContentEditable || FORM_FIELD_TAG.test(el.tagName))
    let tall = viewport?.height ?? window.innerHeight
    const sync = () => {
      const height = viewport?.height ?? window.innerHeight
      const focused = isField(document.activeElement)

      if (!focused)
        tall = Math.max(tall, height)
      setOpen(focused && height < tall * 0.85)
    }

    viewport?.addEventListener('resize', sync)
    window.addEventListener('resize', sync)
    document.addEventListener('focusin', sync)
    document.addEventListener('focusout', sync)

    return () => {
      viewport?.removeEventListener('resize', sync)
      window.removeEventListener('resize', sync)
      document.removeEventListener('focusin', sync)
      document.removeEventListener('focusout', sync)
    }
  }, [])

  return open
}

/**
 * The stepper's bar. Phones: fixed above the tab bar as one row, the status text then Back,
 * Next, a secondary action and the screen's one red action (Next while creating, Save
 * changes while editing, Publish on the last step). From 1024px: sticky under the step.
 */
export function StepBar({
  status,
  tone,
  onBack,
  onForward,
  secondary,
  destructive,
  primary,
  isSaving,
  aboveTabBar = true,
}: {
  status: string
  tone: 'muted' | 'danger' | 'success'
  onBack?: () => void
  onForward?: () => void
  secondary?: BarAction
  /** A destructive action, such as Delete: danger style, trash icon, icon only under 640px. Sits before the arrows. */
  destructive?: BarAction
  /** The screen's one red action. A screen that saves by itself leaves it out. */
  primary?: BarAction
  /** A save is on its way: its two actions are off. */
  isSaving: boolean
  /** The phone bar rides above the merchant tab bar. A page without one (the store's first setup) sets it false and the bar sits at the bottom edge. */
  aboveTabBar?: boolean
}) {
  const { t } = useLocale()
  const keyboardOpen = useKeyboardOpen()

  return (
    <div
      data-testid="step-bar"
      className={`fixed inset-x-3 ${aboveTabBar ? 'bottom-[calc(env(safe-area-inset-bottom,0px)+4.5rem)]' : 'bottom-[calc(env(safe-area-inset-bottom,0px)+0.75rem)]'} z-10 sm:inset-x-4 lg:sticky lg:inset-x-auto lg:bottom-6 ${keyboardOpen ? 'max-lg:hidden' : ''}`}
    >
      <div className="flex items-center gap-2 rounded-2xl bg-surface px-3 py-2 shadow-surface lg:px-4 lg:py-3">
        <span
          aria-live="polite"
          className={`flex min-w-0 flex-1 items-center gap-1.5 text-xs leading-snug lg:text-sm ${tone === 'danger' ? 'text-danger' : tone === 'success' ? 'text-success' : 'text-muted'}`}
          role="status"
        >
          {tone === 'success' && (
            <StatusSuccessIcon aria-hidden className="shrink-0" size={16} />
          )}
          <span className="truncate lg:line-clamp-2 lg:whitespace-normal">
            {status}
          </span>
        </span>
        <div className="flex shrink-0 items-center gap-1.5 lg:gap-2">
          {destructive && (
            <>
              <Button
                isIconOnly
                aria-label={destructive.label}
                className="sm:hidden"
                isDisabled={destructive.isDisabled}
                size="sm"
                variant="danger-soft"
                onPress={destructive.onPress}
              >
                <TrashIcon aria-hidden size={18} />
              </Button>
              <Button
                className="max-sm:hidden"
                isDisabled={destructive.isDisabled}
                size="sm"
                variant="danger-soft"
                onPress={destructive.onPress}
              >
                <TrashIcon aria-hidden size={16} />
                {destructive.label}
              </Button>
            </>
          )}
          {onBack && (
            <Button
              isIconOnly
              aria-label={t('steps.back')}
              size="sm"
              variant="tertiary"
              onPress={onBack}
            >
              <BackIcon aria-hidden size={18} />
            </Button>
          )}
          {onForward && (
            <Button
              isIconOnly
              aria-label={t('steps.next')}
              size="sm"
              variant="tertiary"
              onPress={onForward}
            >
              <ArrowRightIcon aria-hidden size={18} />
            </Button>
          )}
          {secondary && (
            <Button
              isDisabled={isSaving}
              size="sm"
              variant="tertiary"
              onPress={secondary.onPress}
            >
              {secondary.label}
            </Button>
          )}
          {primary && (
            <Button isDisabled={isSaving || primary.isDisabled} size="sm" onPress={primary.onPress}>
              {primary.label}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
