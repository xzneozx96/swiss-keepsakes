import { useRouterState } from '@tanstack/react-router'

import { WarningBanner } from '@/components/warning-banner'
import { useLocale } from '@/contexts/locale-context'
import { apiEnabled } from '@/lib/api-mode'
import { useMe } from '../api/queries'
import { currentStore } from '../lib/current-store'
import { ONBOARDING_PATH } from '../lib/search-params'

/**
 * On every store page but the Calendar while the Owner's store is not open for sale: a warning
 * banner with the way back to Open your store. The banner sticks to the top of the content area and
 * can be closed for the browser session. The Calendar fills the content area to the viewport edge
 * (merchant-shell.tsx), so a banner above it would push its controls out of view.
 */
export function SetupNotice() {
  const { t } = useLocale()
  const me = useMe(apiEnabled)
  const current = currentStore(me.data)
  const onCalendar = useRouterState({ select: state => state.location.pathname === '/store/calendar' })

  if (!apiEnabled || onCalendar || current?.role !== 'owner' || (current.status !== 'onboarding' && current.status !== 'invited'))
    return null

  return (
    <WarningBanner
      action={{ label: t('stores.setup.action'), to: ONBOARDING_PATH }}
      closeLabel={t('stores.setup.close')}
      dismissKey="sk.storeSetupNotice"
      title={t('stores.setup.notice')}
    />
  )
}
