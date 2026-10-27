import type { LinkProps } from '@tanstack/react-router'
import type { IconComponent } from '@/components/icons'

import { buttonVariants, EmptyState as HeroEmptyState } from '@heroui/react'
import { Link } from '@tanstack/react-router'

export interface EmptyStateProps {
  icon: IconComponent
  message: string
  /** At most one next action (UX spec §5.5), shown as a secondary small button. */
  /** `params` fills the `$lang` of a language-prefixed `to`; the router types them per `to`, so they are not checked here. */
  action?: { label: string, to: LinkProps['to'], params?: { lang: string } }
}

/**
 * Design-system EmptyState card: centred, 24px x 16px padding, a 56px icon slot on
 * surface-secondary (placeholder until the 3D travel icon set is sourced), one sentence,
 * one secondary sm action.
 */
export function EmptyState({ icon: Icon, message, action }: EmptyStateProps) {
  return (
    <HeroEmptyState className="flex flex-col items-center gap-3 px-4 py-6 text-center">
      <span
        aria-hidden
        className="flex size-14 items-center justify-center rounded-2xl bg-surface-secondary text-muted"
      >
        <Icon size={28} />
      </span>
      <p className="max-w-xs text-sm text-muted">{message}</p>
      {action && (
        <Link
          className={buttonVariants({ variant: 'secondary', size: 'sm' })}
          params={action.params as never}
          to={action.to}
        >
          {action.label}
        </Link>
      )}
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
      {action && (
        <Link
          className={buttonVariants({ variant: 'secondary', size: 'sm' })}
          params={action.params as never}
          to={action.to}
        >
          {action.label}
        </Link>
      )}
    </HeroEmptyState>
  )
}
