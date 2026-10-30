import type { StepStatus } from '@sk/domain/catalog'

import {
  ArrowRightIcon,
  StatusDangerIcon,
  StatusNeutralIcon,
  StatusSuccessIcon,
  StatusWarningIcon,
} from '@/components/icons'

import { useLocale } from '@/contexts/locale-context'

type MarkState = StepStatus | 'current'

/** The mark's state: the step being edited reads "current", unless it has errors to fix. */
function markState(status: StepStatus, isCurrent: boolean): MarkState {
  return isCurrent && status !== 'error' ? 'current' : status
}

/** Per state: the number circle, the corner icon, the status text and the timeline segment below. */
const markStyle = {
  current: {
    circle: 'bg-foreground text-background',
    icon: 'text-foreground',
    text: 'text-foreground',
    line: 'bg-separator',
    Icon: ArrowRightIcon,
  },
  done: {
    circle: 'bg-success-soft text-success-soft-foreground',
    icon: 'text-success',
    text: 'text-success',
    line: 'bg-success',
    Icon: StatusSuccessIcon,
  },
  warning: {
    circle: 'bg-warning-soft text-warning-soft-foreground',
    icon: 'text-warning',
    text: 'text-warning',
    line: 'bg-warning',
    Icon: StatusWarningIcon,
  },
  error: {
    circle: 'bg-danger-soft text-danger-soft-foreground',
    icon: 'text-danger',
    text: 'text-danger',
    line: 'bg-danger',
    Icon: StatusDangerIcon,
  },
  todo: {
    circle: 'bg-default text-muted',
    icon: 'text-muted',
    text: 'text-muted',
    line: 'bg-separator',
    Icon: StatusNeutralIcon,
  },
} as const satisfies Record<MarkState, object>

/**
 * The numbered circle: the number always shows; a corner icon and the colour carry the state
 * (done green tick, needs attention amber clock, errors brick alert, current ink arrow, to do
 * grey dash).
 */
export function StepMark({
  index,
  status,
  isCurrent,
}: {
  index: number
  status: StepStatus
  isCurrent: boolean
}) {
  const style = markStyle[markState(status, isCurrent)]

  return (
    <span
      aria-hidden
      className={`relative grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold tabular-nums ${style.circle}`}
    >
      {index + 1}
      <span className="absolute -end-1 -bottom-1 grid rounded-full bg-surface p-px">
        <style.Icon className={style.icon} size={14} />
      </span>
    </span>
  )
}

/** The step's status in words, in its colour (never colour alone). */
export function StepStatusText({
  status,
  isCurrent,
}: {
  status: StepStatus
  isCurrent: boolean
}) {
  const { t } = useLocale()
  const state = markState(status, isCurrent)

  return (
    <span className={`text-xs ${markStyle[state].text}`}>
      {t(`steps.status.${state}`)}
    </span>
  )
}

/** The timeline segment from under one step's circle to the next, coloured by the step above. */
export function StepLine({
  status,
  isCurrent,
  className,
}: {
  status: StepStatus
  isCurrent: boolean
  className: string
}) {
  return (
    <span
      aria-hidden
      className={`absolute w-0.5 rounded-full ${markStyle[markState(status, isCurrent)].line} ${className}`}
    />
  )
}
