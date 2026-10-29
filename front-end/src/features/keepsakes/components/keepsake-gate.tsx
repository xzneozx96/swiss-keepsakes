import { EmptyState } from '@/components/empty-state'
import { InfoIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from '@/features/data-client/errors'
import { useMe } from '@/features/stores/api/queries'
import { currentStore } from '@/features/stores/lib/current-store'
import { apiEnabled } from '@/lib/api-mode'

/**
 * The keepsake screens work on the live API only, in the store the person belongs to (`currentStore`, the rule the
 * stores screens use). While the store is unknown `fallback` shows, shaped like the screen.
 */
export function KeepsakeGate({ fallback, children }: { fallback: React.ReactNode, children: (storeId: string) => React.ReactNode }) {
  const { t } = useLocale()
  const me = useMe(apiEnabled)
  const current = currentStore(me.data)

  if (!apiEnabled)
    return <EmptyState icon={InfoIcon} message={t('keepsakes.apiOnly')} />
  if (me.isError) {
    const status = me.error instanceof ApiProblem ? me.error.status : undefined

    return <EmptyState icon={InfoIcon} message={t(status === 401 || status === undefined ? 'keepsakes.loadFailed' : 'keepsakes.problem.forbidden')} />
  }
  if (me.isPending)
    return fallback
  if (!current)
    return <EmptyState icon={InfoIcon} message={t('keepsakes.noStore')} />

  return children(current.storeId)
}
