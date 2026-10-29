import type { StatusTone } from '../lib/keepsake-rules'

const TONE: Record<StatusTone, { text: string, dot: string }> = {
  success: { text: 'text-success', dot: 'bg-success' },
  warning: { text: 'text-warning', dot: 'bg-warning' },
  neutral: { text: 'text-muted', dot: 'border border-muted' },
}

/** The status as text in its tone with a dot, so colour is not the only signal: "● Published". */
export function StatusText({ tone, children }: { tone: StatusTone, children: React.ReactNode }) {
  return (
    <span className={`flex shrink-0 items-center gap-1.5 text-xs font-medium whitespace-nowrap lg:text-sm ${TONE[tone].text}`} data-status-tone={tone}>
      <span aria-hidden className={`size-2 shrink-0 rounded-full ${TONE[tone].dot}`} />
      {children}
    </span>
  )
}
