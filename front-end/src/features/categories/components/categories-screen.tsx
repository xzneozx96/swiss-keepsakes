import type { CategoryKind } from '@sk/api-contract'

import { Skeleton, Tabs } from '@heroui/react'
import { useState } from 'react'

import { EmptyState } from '@/components/empty-state'
import { InfoIcon } from '@/components/icons'
import { STICKY_TABS } from '@/components/layout/sticky-tabs'
import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from '@/features/data-client/errors'
import { useMe } from '@/features/stores/api/queries'
import { currentStore } from '@/features/stores/lib/current-store'
import { apiEnabled } from '@/lib/api-mode'
import { CategoryList } from './category-list'

const KINDS: CategoryKind[] = ['map', 'blog']

/**
 * N23, Content > Categories: the map list and the blog list of the store, one tab each. The store is
 * `currentStore(me)`, the same rule the stores screens use. The categories work with the live API only.
 */
export function CategoriesScreen() {
  const { t } = useLocale()
  const me = useMe(apiEnabled)
  const current = currentStore(me.data)
  const [tab, setTab] = useState<CategoryKind>('map')

  if (!apiEnabled)
    return <EmptyState icon={InfoIcon} message={t('categories.apiOnly')} />
  if (me.isError || (!me.isPending && !current)) {
    const status = me.error instanceof ApiProblem ? me.error.status : undefined

    return <EmptyState icon={InfoIcon} message={t(status === 401 || status === undefined ? 'categories.loadFailed' : 'categories.problem.forbidden')} />
  }

  return (
    <div className="flex flex-col gap-4" data-testid="categories-screen">
      <h1 className="text-title">{t('categories.title')}</h1>
      <Tabs className="w-full" selectedKey={tab} onSelectionChange={key => setTab(key as CategoryKind)}>
        <Tabs.ListContainer className={`w-full ${STICKY_TABS}`}>
          <Tabs.List aria-label={t('categories.tabs')}>
            {KINDS.map((kind, index) => (
              <Tabs.Tab key={kind} className="min-h-11 whitespace-nowrap" id={kind}>
                {index > 0 && <Tabs.Separator />}
                {t(`categories.tab.${kind}`)}
                <Tabs.Indicator />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
        {KINDS.map(kind => (
          <Tabs.Panel key={kind} className="px-0 pt-4 pb-0" id={kind}>
            {current
              ? <CategoryList kind={kind} storeId={current.storeId} />
              : <Skeleton className="h-28 w-full rounded-3xl" />}
          </Tabs.Panel>
        ))}
      </Tabs>
    </div>
  )
}
