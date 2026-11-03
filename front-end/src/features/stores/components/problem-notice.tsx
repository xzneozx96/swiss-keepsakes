import type { MessageKey } from '@/i18n/en'

import { ErrorNotice } from '@/components/error-notice'
import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from '@/features/data-client/errors'
import { genericProblemKey } from '../lib/refusals'

/** A failed read or write with no screen of its own: what happened, the reference to quote, and one retry. */
export function ProblemNotice({ error, message, onRetry }: { error: unknown, message?: MessageKey, onRetry?: () => void }) {
  const { t } = useLocale()

  return <ErrorNotice reference={error instanceof ApiProblem ? error.requestId : undefined} message={t(message ?? genericProblemKey(error))} onRetry={onRetry} />
}
