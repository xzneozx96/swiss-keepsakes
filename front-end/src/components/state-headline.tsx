import type { IconComponent } from '@/components/icons'

import {
  StatusDangerIcon,
  StatusInfoIcon,
  StatusSuccessIcon,
  StatusWarningIcon,
} from '@/components/icons'

export type HeadlineStatus = 'default' | 'success' | 'warning' | 'danger'

const statusIcon: Record<HeadlineStatus, IconComponent> = {
  default: StatusInfoIcon,
  success: StatusSuccessIcon,
  warning: StatusWarningIcon,
  danger: StatusDangerIcon,
}

const statusTone: Record<HeadlineStatus, string> = {
  default: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
}

/**
 * A state's headline (C15 ticket, 1.13r): tone icon, heading and one sentence, used instead of
 * an alert box. The heading takes focus by script when the state changes under the guest.
 */
export function StateHeadline({
  status,
  title,
  body,
  id,
  ref,
}: {
  status: HeadlineStatus
  title: string
  body?: string
  id?: string
  ref?: React.Ref<HTMLHeadingElement>
}) {
  const Icon = statusIcon[status]

  return (
    <div className="flex gap-3">
      <Icon
        aria-hidden
        className={`mt-0.5 shrink-0 ${statusTone[status]}`}
        size={22}
      />
      <div className="flex min-w-0 flex-col gap-1">
        <h2
          ref={ref}
          className="rounded text-heading text-balance outline-none focus-visible:focus-ring"
          id={id}
          tabIndex={-1}
        >
          {title}
        </h2>
        {body && <p className="text-sm text-muted">{body}</p>}
      </div>
    </div>
  )
}
