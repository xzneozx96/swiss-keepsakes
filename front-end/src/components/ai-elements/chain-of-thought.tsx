import type { ComponentProps, ReactNode } from 'react'

import clsx from 'clsx'
import { useState } from 'react'

import {
  ChevronDownIcon,
  SparkleIcon,
  StatusDangerIcon,
  StatusSuccessIcon,
} from '@/components/icons'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './collapsible'

/**
 * The agent's trace, after the agentic-rag ChainOfThought: one collapsible per run of
 * reasoning and tool calls, a vertical timeline of steps, no card around it.
 */
export function ChainOfThought({
  className,
  ...props
}: ComponentProps<typeof Collapsible>) {
  return (
    <Collapsible
      className={clsx('not-prose w-full min-w-0', className)}
      {...props}
    />
  )
}

export function ChainOfThoughtHeader({
  label,
  isStreaming = false,
}: {
  label: string
  isStreaming?: boolean
}) {
  return (
    <CollapsibleTrigger className="group inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-md py-1 text-[13px] text-muted outline-none transition-colors hover:text-foreground focus-visible:focus-ring">
      <SparkleIcon
        aria-hidden
        className={clsx('shrink-0', isStreaming && 'animate-pulse text-accent')}
        size={15}
      />
      <span
        className={clsx('truncate font-medium', isStreaming && 'text-shimmer')}
      >
        {label}
      </span>
      <ChevronDownIcon
        aria-hidden
        className="shrink-0 transition-transform duration-200 group-aria-expanded:rotate-180"
        size={14}
      />
    </CollapsibleTrigger>
  )
}

export function ChainOfThoughtContent({
  children,
  ...props
}: ComponentProps<typeof CollapsibleContent>) {
  return (
    <CollapsibleContent {...props}>
      <div className="pt-1.5 pb-1">{children}</div>
    </CollapsibleContent>
  )
}

export type StepStatus = 'complete' | 'active' | 'pending' | 'error'

function StatusMark({ status }: { status: StepStatus }) {
  if (status === 'active') {
    return (
      <span className="size-3.5 rounded-full border-2 border-muted/25 border-t-accent motion-safe:animate-spin" />
    )
  }
  if (status === 'complete') {
    return (
      <StatusSuccessIcon
        aria-hidden
        className="animate-pop text-muted"
        size={16}
      />
    )
  }
  if (status === 'error') {
    return (
      <StatusDangerIcon
        aria-hidden
        className="animate-pop text-danger"
        size={16}
      />
    )
  }

  return (
    <span className="size-3.5 rounded-full border border-dashed border-muted/50" />
  )
}

/** One step. It opens while active and closes when complete, unless `autoExpand` is off. */
export function ChainOfThoughtStep({
  label,
  description,
  status,
  children,
  isLast = false,
  autoExpand = true,
}: {
  label: string
  description?: string
  status: StepStatus
  children?: ReactNode
  isLast?: boolean
  autoExpand?: boolean
}) {
  const hasContent = !!(description || children)
  const opensOn = (s: StepStatus) =>
    s === 'error' || (autoExpand && s === 'active')
  const [open, setOpen] = useState(() => opensOn(status))
  const [prev, setPrev] = useState(status)

  if (prev !== status) {
    setPrev(status)
    if (opensOn(status))
      setOpen(true)
    else if (autoExpand && status === 'complete')
      setOpen(false)
  }

  const labelClass = clsx(
    'min-w-0 text-start text-[13px] leading-5',
    status === 'active' ? 'text-shimmer font-medium' : 'text-muted',
    status === 'error' && 'text-danger',
  )

  const rail = (
    <div className="flex w-4 shrink-0 flex-col items-center">
      <span className="mt-0.5 flex size-4 items-center justify-center">
        <StatusMark status={status} />
      </span>
      {!isLast && <span className="my-1 w-px flex-1 bg-separator" />}
    </div>
  )

  if (!hasContent) {
    return (
      <div className="animate-rise flex gap-2.5">
        {rail}
        <div className="min-w-0 flex-1 pb-3">
          <span className={labelClass}>{label}</span>
        </div>
      </div>
    )
  }

  return (
    <Collapsible
      className="animate-rise flex gap-2.5"
      open={open}
      onOpenChange={setOpen}
    >
      {rail}
      <div className="min-w-0 flex-1 pb-3">
        <CollapsibleTrigger className="group inline-flex max-w-full cursor-pointer items-center gap-1 rounded-md text-start outline-none transition-colors hover:text-foreground focus-visible:focus-ring">
          <span className={labelClass}>{label}</span>
          <ChevronDownIcon
            aria-hidden
            className="shrink-0 text-muted transition-transform duration-200 group-aria-expanded:rotate-180"
            size={14}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 space-y-2">
            {description && (
              <p
                className={clsx(
                  'max-h-60 overflow-y-auto text-xs leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]',
                  status === 'error' ? 'text-danger' : 'text-muted',
                )}
              >
                {description}
              </p>
            )}
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
