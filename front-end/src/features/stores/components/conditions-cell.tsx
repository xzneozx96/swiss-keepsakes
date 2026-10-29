import type { AdminStore } from '@sk/api-contract'

import { ProgressBar } from '@heroui/react'

import { useLocale } from '@/contexts/locale-context'
import { conditionsMet } from '../lib/conditions-met'

/**
 * "Before opening n of 4" with a thin ink bar. A store open for sale has nothing left to do and shows no bar, an
 * invited store has not started, and a store the Super Admin suspended keeps the bar it had.
 */
export function ConditionsCell({ store, hasTitle = false }: { store: AdminStore, hasTitle?: boolean }) {
  const { t } = useLocale()

  if (store.status === 'live')
    return <span className="text-muted">–</span>
  if (store.status === 'invited')
    return <span className="text-sm text-muted">{t('stores.conditions.notStarted')}</span>
  const met = conditionsMet(store)

  return (
    <div className="flex w-full max-w-40 flex-col gap-1.5">
      <span className="flex items-baseline justify-between gap-3 text-sm tabular-nums">
        {hasTitle && <span className="text-muted">{t('stores.conditions.title')}</span>}
        <span>{t('stores.conditions.count', { n: met })}</span>
      </span>
      <ProgressBar aria-label={t('stores.conditions.label', { name: store.name, n: met })} color="default" maxValue={4} size="sm" value={met}>
        <ProgressBar.Track>
          <ProgressBar.Fill />
        </ProgressBar.Track>
      </ProgressBar>
    </div>
  )
}
