import type { MessageKey } from '@/i18n/en'

import { EmptyState } from '@/components/empty-state'
import { InfoIcon } from '@/components/icons'
import { MerchantPageHeader } from '@/components/layout/merchant-page-header'
import { useLocale } from '@/contexts/locale-context'
import { useMe } from '@/features/stores/api/queries'
import { currentStore } from '@/features/stores/lib/current-store'
import { apiEnabled } from '@/lib/api-mode'

/**
 * The stories screens work on the live API only, in the store the person belongs to (`currentStore`, the rule the
 * stores screens use). While the store is unknown `fallback` shows, shaped like the screen. The other states keep the
 * page title above their message.
 */
export function StoriesGate({ fallback, children }: { fallback: React.ReactNode, children: (storeId: string) => React.ReactNode }) {
  const { t } = useLocale()
  const me = useMe(apiEnabled)
  const current = currentStore(me.data)
  let message: MessageKey | undefined

  if (!apiEnabled)
    message = 'merchantStories.apiOnly'
  else if (me.isError)
    message = 'merchantStories.loadFailed'
  else if (!me.isPending && !current)
    message = 'merchantStories.noStore'

  if (message) {
    return (
      <>
        <MerchantPageHeader description={t('merchantStories.description')} title={t('merchantStories.title')} />
        <EmptyState icon={InfoIcon} message={t(message)} />
      </>
    )
  }
  if (!current)
    return fallback

  return children(current.storeId)
}
