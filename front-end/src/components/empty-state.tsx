import type { LinkProps } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import type { IconComponent } from '@/components/icons'

import { Button, buttonVariants, EmptyState as HeroEmptyState } from '@heroui/react'
import { Link } from '@tanstack/react-router'

export interface EmptyStateProps {
  icon: IconComponent
  message: string
  /**
   * At most one next action (UX spec §5.5), shown as a secondary small button: a link (`to`) or a press (`onPress`,
   * for an action that stays on the screen, such as adding a row).
   * `params` fills the `$lang` of a language-prefixed `to`; the router types them per `to`, so they are not checked here.
   */
  action?: EmptyAction
  /** The state sits inside a card or block that has its own padding and surface: smaller icon, no card padding. */
  compact?: boolean
  /** The sentence is an error (a blocked publish): danger colour, announced as an alert. */
  alert?: boolean
  /** Replaces `action` when the state has more than one way forward, such as upload or choose from the library. */
  children?: ReactNode
}

export type EmptyAction = { label: string, to: LinkProps['to'], params?: { lang: string } } | { label: string, onPress: () => void }

function ActionButton({ action }: { action: EmptyAction }) {
  if ('onPress' in action)
    return <Button className="max-lg:min-h-11" size="sm" variant="secondary" onPress={action.onPress}>{action.label}</Button>

  return (
    <Link
      className={buttonVariants({ variant: 'secondary', size: 'sm' })}
      params={action.params as never}
      to={action.to}
    >
      {action.label}
    </Link>
  )
}

/**
 * Design-system EmptyState card: centred, 24px x 16px padding, a 56px icon slot on
 * surface-secondary (placeholder until the 3D travel icon set is sourced), one sentence,
 * one secondary sm action.
 */
export function EmptyState({ icon: Icon, message, action, compact = false, alert = false, children }: EmptyStateProps) {
  return (
    <HeroEmptyState className={`flex flex-col items-center text-center ${compact ? 'gap-2 px-2 py-3' : 'gap-3 px-4 py-6'}`}>
      <span
        aria-hidden
        className={`flex items-center justify-center bg-surface-secondary text-muted ${compact ? 'size-12 rounded-xl' : 'size-14 rounded-2xl'}`}
      >
        <Icon size={compact ? 24 : 28} />
      </span>
      <p className={`max-w-xs text-sm text-pretty ${alert ? 'text-danger' : 'text-muted'}`} role={alert ? 'alert' : undefined}>{message}</p>
      {children ?? (action && <ActionButton action={action} />)}
    </HeroEmptyState>
  )
}

/**
 * Table.Body `renderEmptyState` content, in the HeroUI Table docs pattern: the table keeps its
 * column headers and the empty state sits inside it. Same message and action as the card above.
 */
export function TableEmptyState({
  icon: Icon,
  message,
  action,
}: EmptyStateProps) {
  return (
    <HeroEmptyState className="flex h-full w-full flex-col items-center justify-center gap-4 py-8 text-center">
      <Icon className="text-muted" size={24} />
      <span className="text-sm text-muted">{message}</span>
      {action && <ActionButton action={action} />}
    </HeroEmptyState>
  )
}
