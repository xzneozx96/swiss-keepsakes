import { Link } from '@tanstack/react-router'

import { useLocale } from '@/contexts/locale-context'
import { apiEnabled } from '@/lib/api-mode'
import { useMe } from '../api/queries'
import { currentStore } from '../lib/current-store'
import { ONBOARDING_PATH } from '../lib/search-params'

/** On every store page while the Owner's store is not open for sale: a line with the way back to Open your store. */
export function SetupNotice() {
  const { t } = useLocale()
  const me = useMe(apiEnabled)
  const current = currentStore(me.data)

  if (!apiEnabled || current?.role !== 'owner' || (current.status !== 'onboarding' && current.status !== 'invited'))
    return null

  return (
    <p className="mb-4 text-sm text-muted">
      {`${t('stores.setup.notice')} `}
      <Link className="font-medium text-foreground underline underline-offset-2" to={ONBOARDING_PATH}>{t('stores.onboarding.title')}</Link>
    </p>
  )
}
