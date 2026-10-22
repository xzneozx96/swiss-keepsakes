import type { MessageKey } from '@/i18n/en'

import { Button } from '@heroui/react'

import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from '@/features/data-client/errors'
import { genericProblemKey } from '../lib/refusals'

/** A failed read or write with no screen of its own: what happened, the reference to quote, and one retry. */
export function ProblemNotice({ error, message, onRetry }: { error: unknown, message?: MessageKey, onRetry?: () => void }) {
  const { t } = useLocale()

  return (
    <div className="flex flex-col items-start gap-2 rounded-2xl bg-danger-soft p-4 text-sm text-danger-soft-foreground" role="alert">
      <p>{t(message ?? genericProblemKey(error))}</p>
      {error instanceof ApiProblem && error.requestId && (
        <p className="text-xs opacity-80">{t('stores.problem.requestId', { id: error.requestId })}</p>
      )}
      {onRetry && (
        <Button variant="secondary" onPress={onRetry}>
          {t('stores.problem.retry')}
        </Button>
      )}
    </div>
  )
}
