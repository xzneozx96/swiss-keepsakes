import { Tabs } from '@heroui/react'
import { useState } from 'react'

import { EmptyState } from '@/components/empty-state'
import { MoreIcon } from '@/components/icons'
import { MerchantPageHeader } from '@/components/layout/merchant-page-header'
import { useLocale } from '@/contexts/locale-context'
import { apiEnabled } from '@/lib/api-mode'
import { useMe } from '../api/queries'
import { showsMembersTab } from '../lib/member-problems'
import { MembersTab } from './members-tab'

type SettingsTab = 'general' | 'members'

/**
 * M22 inside the merchant shell's Settings. Settings is still the Phase 6 placeholder, so the members tab is the
 * first thing in it: an Owner gets "General" (the placeholder) and "Members". A Manager, and the demo, get the
 * placeholder alone. The store is the first entry of `GET /api/me` `stores`: Phase 1 has one store per person.
 */
export function SettingsScreen() {
  const { t } = useLocale()
  const me = useMe(apiEnabled)
  const current = me.data?.stores[0]
  const [tab, setTab] = useState<SettingsTab>('general')
  const placeholder = (
    <EmptyState
      action={{ label: t('placeholder.backToday'), to: '/store' }}
      icon={MoreIcon}
      message={t('placeholder.laterPhase')}
    />
  )

  if (!apiEnabled || !current || !showsMembersTab(current))
    return placeholder

  return (
    <div className="flex flex-col gap-4">
      <MerchantPageHeader description={t('stores.members.intro')} title={t('nav.settings')} />
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
