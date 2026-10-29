import { Skeleton } from '@heroui/react'
import { useEffect, useState } from 'react'

import { EmptyState } from '@/components/empty-state'
import { MoreIcon } from '@/components/icons'
import { PageTabs, TabPanel } from '@/components/page-tabs'
import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from '@/features/data-client/errors'
import { apiEnabled } from '@/lib/api-mode'
import { useMe } from '../api/queries'
import { useGoToSignIn } from '../hooks/use-go-to-sign-in'
import { currentStore } from '../lib/current-store'
import { showsMembersTab } from '../lib/member-problems'
import { SETTINGS_PATH } from '../lib/search-params'
import { MembersTab } from './members-tab'

type SettingsTab = 'general' | 'members'

/**
 * M22 inside the merchant shell's Settings. Settings is still the Phase 6 placeholder, so the members tab is the
 * first thing in it: an Owner gets "General" (the placeholder) and "Members". A Manager, and the demo, get the
 * placeholder alone. The store is `currentStore(me)`, the same rule A02 uses. An Owner opens on Members, the reason
 * to come here, and the tabs wait for `GET /api/me` behind a skeleton, so they do not pop in. A session that ended
 * (401) goes to sign-in and comes back to Settings.
 */
export function SettingsScreen() {
  const { t } = useLocale()
  const me = useMe(apiEnabled)
  const goToSignIn = useGoToSignIn(SETTINGS_PATH)
  const current = currentStore(me.data)
  const signedOut = me.error instanceof ApiProblem && me.error.status === 401
  const [tab, setTab] = useState<SettingsTab>('members')

  useEffect(() => {
    if (signedOut)
      goToSignIn()
  }, [signedOut, goToSignIn])

  const placeholder = (
    <EmptyState
      action={{ label: t('placeholder.backToday'), to: '/store' }}
      icon={MoreIcon}
      message={t('placeholder.laterPhase')}
    />
  )

  if (apiEnabled && (me.isPending || signedOut)) {
    return (
      <div aria-busy className="flex flex-col gap-4">
        <p aria-live="polite" className="sr-only" role="status">{t('nav.settings')}</p>
        <h1 className="text-title">{t('nav.settings')}</h1>
        <div className="flex items-center gap-2 max-lg:py-2" data-skeleton="tabs">
          <div className="flex w-fit gap-1 rounded-3xl bg-default p-1">
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
        </div>
      </div>
    )
  }
  if (!apiEnabled || !current || !showsMembersTab(current))
    return placeholder

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-title">{t('nav.settings')}</h1>
      <PageTabs
        label={t('stores.members.tabs')}
        selected={tab}
        tabs={[
          { id: 'general', label: t('stores.members.general') },
          { id: 'members', label: t('stores.members.title') },
        ]}
        onSelect={setTab}
      >
        <TabPanel id="general">{placeholder}</TabPanel>
        <TabPanel id="members">
          <MembersTab storeId={current.storeId} />
        </TabPanel>
      </PageTabs>
    </div>
  )
}
