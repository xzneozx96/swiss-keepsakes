import { ErrorNotice } from '@/components/error-notice'
import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from '@/features/data-client/errors'
import { problemMessageKey, problemTypeOf } from '../lib/problems'

/** A failed read or write that has no field of its own: what happened, the reference to quote, and one retry. */
export function KeepsakeNotice({ error, type, onRetry }: { error?: unknown, type?: string, onRetry?: () => void }) {
  const { t } = useLocale()

  return <ErrorNotice reference={error instanceof ApiProblem ? error.requestId : undefined} message={t(problemMessageKey(type ?? problemTypeOf(error)))} onRetry={onRetry} />
}
