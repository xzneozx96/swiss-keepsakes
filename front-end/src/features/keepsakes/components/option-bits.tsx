import type { ReactNode } from 'react'
import type { OptionsDraftState } from '../hooks/use-options-draft'

import { ChevronDownIcon, StatusDangerIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { refusalText } from '../lib/option-rules'

/** One line in the danger tone with a small icon: a refusal or a rule, with no box around it. */
export function QuietNote({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-sm text-pretty text-danger" role="alert">
      <StatusDangerIcon aria-hidden className="mt-0.5 shrink-0" size={14} />
      <span>{children}</span>
    </p>
  )
}

/** The refusal and the rule texts that belong to one place: an option, one of its values, or its "a value for every variant" panel. */
export function NotesAt({ draft, at, only }: { draft: OptionsDraftState, at: string, /** Only the refused delete, or only the rule texts. */ only?: 'refusal' | 'problems' }) {
  const { t } = useLocale()
  const refusal = only === 'problems' ? undefined : draft.refusalAt(at)
  const problems = only === 'refusal' ? [] : draft.problemsAt(at)

  if (!refusal && problems.length === 0)
    return null

  return (
    <div className="flex flex-col gap-1">
      {refusal && <QuietNote>{refusalText(t, refusal)}</QuietNote>}
      {problems.map(problem => <QuietNote key={`${problem.code}:${problem.at}`}>{refusalText(t, problem)}</QuietNote>)}
    </div>
  )
}

/** A text button that opens something below it. */
export function RevealLink({ expanded, onToggle, children, controls }: { expanded: boolean, onToggle: () => void, children: ReactNode, controls: string }) {
  return (
    <button
      aria-controls={controls}
      aria-expanded={expanded}
      className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-lg text-sm font-medium text-muted outline-none hover:text-foreground focus-visible:focus-ring lg:min-h-9"
      type="button"
      onClick={onToggle}
    >
      {children}
      <ChevronDownIcon aria-hidden className={`transition-transform duration-200 ease-out motion-reduce:transition-none ${expanded ? 'rotate-180' : ''}`} size={14} />
    </button>
  )
}
