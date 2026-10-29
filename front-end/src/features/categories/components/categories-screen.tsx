import type { CategoryKind } from '@sk/api-contract'

import { useState } from 'react'

import { EmptyState } from '@/components/empty-state'
import { InfoIcon } from '@/components/icons'
import { PageTabs } from '@/components/page-tabs'
import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from '@/features/data-client/errors'
import { useMe } from '@/features/stores/api/queries'
import { currentStore } from '@/features/stores/lib/current-store'
import { apiEnabled } from '@/lib/api-mode'
import { CategoryEditor } from './category-editor'

const KINDS: CategoryKind[] = ['map', 'blog']

/**
 * N23, Content > Categories: the map list and the blog list of the store, one tab each, a grouped table from
 * 1024 px and a drill-in below it. The store is
 * `currentStore(me)`, the same rule the stores screens use. The categories work with the live API only.
 */
export function CategoriesScreen() {
  const { t } = useLocale()
  const me = useMe(apiEnabled)
  const current = currentStore(me.data)
  const [tab, setTab] = useState<CategoryKind>('map')

  if (!apiEnabled)
    return <EmptyState icon={InfoIcon} message={t('categories.apiOnly')} />
  if (me.isError) {
    const status = me.error instanceof ApiProblem ? me.error.status : undefined

    return <EmptyState icon={InfoIcon} message={t(status === 401 || status === undefined ? 'categories.loadFailed' : 'categories.problem.forbidden')} />
  }
  if (!me.isPending && !current)
    return <EmptyState icon={InfoIcon} message={t('categories.noStore')} />

  const tabs = (
    <PageTabs
      fill
      label={t('categories.tabs')}
      selected={tab}
      tabs={KINDS.map(kind => ({ id: kind, label: t(`categories.tab.${kind}`) }))}
      onSelect={setTab}
    />
  )

  return (
    <div className="flex flex-col gap-4" data-testid="categories-screen">
      <CategoryEditor kind={tab} storeId={current?.storeId} tabs={tabs} />
    </div>
  )
}
