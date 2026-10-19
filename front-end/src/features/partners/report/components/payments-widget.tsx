import type { IconComponent } from '@/components/icons'
import type { StatusTone } from '@/components/status-chip'

import {
  CashIcon,
  InfoIcon,
  ResetIcon,
  SelectedIcon,
} from '@/components/icons'
import { Widget } from '@/features/merchant/today/components/overview-analytics'

export interface PaymentsView {
  heading: string
  /** "CHF 22.35 to offset carried from before 1 Oct", or null. */
  carriedIn: string | null
  /** In the order they happened, oldest first. */
  rows: {
    id: string
    kind: 'payout' | 'adjustment' | 'offset'
    text: string
    date: string
    amount: string
    tone: StatusTone
  }[]
  /** "Offset in this period", "Still to offset" and their values. */
  totals: { label: string, value: string }[]
}

const amountTone: Record<StatusTone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  info: 'text-foreground',
  neutral: 'text-muted',
}

/** One icon and soft tint per kind of entry, as the status chips colour them. */
const kindMark: Record<
  PaymentsView['rows'][number]['kind'],
  { icon: IconComponent, className: string }
> = {
  payout: {
    icon: CashIcon,
    className: 'bg-success-soft text-success-soft-foreground',
  },
  adjustment: {
    icon: ResetIcon,
    className: 'bg-warning-soft text-warning-soft-foreground',
  },
  offset: { icon: SelectedIcon, className: 'bg-default text-muted' },
}

/**
 * P02 payouts, refund adjustments and offsets for the period (step 5.7, AC13, D16) as an
 * activity log: newest first, each entry with its kind's icon on a connecting line, what it
 * was, when, and the amount. The carried-in amount closes the log as its oldest entry; the
 * period's offset totals sit under it.
 */
export function PaymentsWidget({
  view,
  className = '',
  isBare = false,
}: {
  view: PaymentsView
  className?: string
  /** Without the widget shell, inside a tab panel that already has one. */
  isBare?: boolean
}) {
  const entries = [...view.rows].reverse()
  const log = (
    <div className="flex flex-col gap-4">
      <ol aria-label={view.heading} className="flex flex-col">
        {entries.map((row, i) => {
          const mark = kindMark[row.kind]
          const Icon = mark.icon
          const isLast = i === entries.length - 1 && !view.carriedIn

          return (
            <li key={row.id} className="relative flex gap-3 pb-5 last:pb-0">
              {!isLast && (
                <span
                  aria-hidden
                  className="absolute start-[17px] top-10 bottom-1 border-s-2 border-separator"
                />
              )}
              <span
                aria-hidden
                className={`flex size-9 shrink-0 items-center justify-center rounded-full ${mark.className}`}
              >
                <Icon size={18} />
              </span>
              <div className="flex min-w-0 flex-1 items-start justify-between gap-3 pt-1">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-medium text-pretty">
                    {row.text}
                  </span>
                  <span className="text-xs text-muted tabular-nums">
                    {row.date}
                  </span>
                </div>
                <span
                  className={`shrink-0 text-sm font-semibold tabular-nums ${amountTone[row.tone]}`}
                >
                  {row.amount}
                </span>
              </div>
            </li>
          )
        })}
        {view.carriedIn && (
          <li className="flex gap-3">
            <span
              aria-hidden
              className="flex size-9 shrink-0 items-center justify-center rounded-full border border-dashed border-separator text-muted"
            >
              <InfoIcon size={18} />
            </span>
            <span className="min-w-0 pt-2 text-sm text-pretty text-muted">
              {view.carriedIn}
            </span>
          </li>
        )}
      </ol>
      {view.totals.length > 0 && (
        <dl className="flex flex-col gap-2 rounded-2xl bg-surface-secondary p-3 text-sm">
          {view.totals.map(total => (
            <div
              key={total.label}
              className="flex justify-between gap-3 tabular-nums"
            >
              <dt className="text-muted">{total.label}</dt>
              <dd className="font-medium">{total.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )

  return isBare
    ? (
        log
      )
    : (
        <Widget className={className} id="report-payments" title={view.heading}>
          {log}
        </Widget>
      )
}
