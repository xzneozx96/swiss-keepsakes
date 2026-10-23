import { Skeleton, Tabs } from '@heroui/react'
import { useEffect, useState } from 'react'

import { EmptyState } from '@/components/empty-state'
import { MoreIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from '@/features/data-client/errors'
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
  const me = useMe()
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

  if (me.isPending || signedOut) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-title">{t('nav.settings')}</h1>
        <Skeleton className="h-11 w-48 rounded-2xl" />
      </div>
    )
  }
  if (!current || !showsMembersTab(current))
    return placeholder

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-title">{t('nav.settings')}</h1>
      <Tabs className="w-full" selectedKey={tab} onSelectionChange={key => setTab(key as SettingsTab)}>
        <Tabs.ListContainer className="w-fit max-w-full">
          <Tabs.List aria-label={t('stores.members.tabs')}>
            <Tabs.Tab className="min-h-11 whitespace-nowrap" id="general">
              {t('stores.members.general')}
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab className="min-h-11 whitespace-nowrap" id="members">
              <Tabs.Separator />
              {t('stores.members.title')}
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
        <Tabs.Panel className="px-0 pb-0" id="general">{placeholder}</Tabs.Panel>
        <Tabs.Panel className="px-0 pb-0" id="members">
          <MembersTab storeId={current.storeId} />
        </Tabs.Panel>
      </Tabs>
    </div>
  )
}
