import { Button } from '@heroui/react'

import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from '@/features/data-client/errors'
import { problemMessageKey, problemTypeOf } from '../lib/problems'

/** A failed read or write that has no field of its own: what happened, the reference to quote, and one retry. */
export function KeepsakeNotice({ error, type, onRetry }: { error?: unknown, type?: string, onRetry?: () => void }) {
  const { t } = useLocale()

  return (
    <div className="flex flex-col items-start gap-2 rounded-2xl bg-danger-soft p-4 text-sm text-danger-soft-foreground" role="alert">
      <p>{t(problemMessageKey(type ?? problemTypeOf(error)))}</p>
      {error instanceof ApiProblem && error.requestId && <p className="text-xs opacity-80">{t('keepsakes.requestId', { id: error.requestId })}</p>}
      {onRetry && (
        <Button className="min-h-11" variant="secondary" onPress={onRetry}>
          {t('keepsakes.retry')}
        </Button>
      )}
    </div>
  )
}
