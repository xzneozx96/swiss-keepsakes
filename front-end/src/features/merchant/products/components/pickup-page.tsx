import type { PickupPlace } from '@sk/api-contract'

import type { PickupView } from '@/features/pickup/lib/list'
import { Skeleton } from '@heroui/react'

import { useState } from 'react'
import { EmptyState } from '@/components/empty-state'
import { FilterButtons, FilterChips, filterGroup } from '@/components/filter-bar'
import { PickupIcon, PlusIcon } from '@/components/icons'
import { ListAction, ListHeader, ListSearch, ListToolbar } from '@/components/layout/list-toolbar'
import { useLocale } from '@/contexts/locale-context'
import { filterPickup } from '@/features/pickup/lib/list'
import { apiEnabled } from '@/lib/api-mode'
import { usePickupPoints } from '../hooks/use-pickup-points'
import { PickupPointSheet } from './pickup-point-sheet'
import { PickupPoints } from './pickup-points'

/** Pickup points: two columns of cards, each with icon tile, name, hours and instructions. */
function PickupSkeleton() {
  return (
    <ul aria-hidden className="grid gap-5 lg:grid-cols-2">
      {[0, 1, 2, 3].map(i => (
        <li
          key={i}
          className="flex flex-col overflow-hidden rounded-3xl bg-surface shadow-surface"
        >
          <div className="flex items-center gap-4 p-4">
            <Skeleton className="size-14 shrink-0 rounded-lg" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-3/5 rounded-lg" />
              <Skeleton className="h-3 w-4/5 rounded-lg" />
            </div>
          </div>
          <div className="px-4 pb-4">
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <div className="flex flex-col gap-2 border-t border-dashed border-separator px-4 py-3.5">
            <Skeleton className="h-4 w-1/3 rounded-lg" />
            <Skeleton className="h-4 w-full rounded-lg" />
            <Skeleton className="mt-1 h-8 w-24 rounded-lg max-lg:h-11" />
          </div>
        </li>
      ))}
    </ul>
  )
}

/**
 * M14 Pickup points, a page of its own under Products (design of 2026-10-29: no product tabs). The header, the
 * Status filter (Active / Archived, as archived partners on M15), one ticket per point, and the sheet that edits one.
 */
export function PickupPage() {
  const { t } = useLocale()
  const pickup = usePickupPoints(true)
  // The point being edited (a snapshot of the ticket), or an empty object for a new one.
  const [sheet, setSheet] = useState<{ place?: PickupPlace } | null>(null)
  // None ticked shows the active points; Archived alone shows those; both shows both.
  const [view, setView] = useState<PickupView[]>([])
  const [query, setQuery] = useState('')
  const places = (archived: boolean) => (archived ? pickup.archived : pickup.active).data?.items ?? []
  const groups = [
    filterGroup({
      id: 'view',
      label: t('products.view.label'),
      options: (['active', 'archived'] as const).map(v => ({
        id: v,
        label: t(`products.view.${v}`),
        count: places(v === 'archived').length,
      })),
      selected: view,
      onChange: setView,
    }),
  ]

  const panel = () => {
    if (!apiEnabled)
      return <EmptyState icon={PickupIcon} message={t('keepsakes.apiOnly')} />
    if (pickup.me.isError || pickup.active.isError || (view.includes('archived') && pickup.archived.isError))
      return <EmptyState alert icon={PickupIcon} message={t('pickup.loadFailed')} />
    if (pickup.me.isPending || (pickup.storeId && (pickup.active.isPending || (view.includes('archived') && pickup.archived.isPending))))
      return <PickupSkeleton />
    if (!pickup.storeId)
      return <EmptyState icon={PickupIcon} message={t('pickup.noStore')} />
    const showing = filterPickup(places(false), places(true), view, query)

    if (!showing.length) {
      if (query.trim() !== '')
        return <EmptyState action={{ label: t('pickup.clear'), onPress: () => { setQuery(''); setView([]) } }} icon={PickupIcon} message={t('pickup.empty.filtered')} />

      return <EmptyState icon={PickupIcon} message={t(view.length === 1 && view[0] === 'archived' ? 'products.empty.archived' : 'products.empty.pickup')} />
    }

    return <PickupPoints label={t('pickup.title')} places={showing} onArchive={pickup.archive} onOpen={place => setSheet({ place })} onRestore={pickup.restore} />
  }

  return (
    <div className="flex flex-col gap-4" data-testid="pickup-page">
      <ListHeader
        // The screen's one red action, as M15's "Add partner".
        action={<ListAction icon={PlusIcon} isDisabled={!pickup.storeId} onPress={() => setSheet({})}>{t('pickup.action.add')}</ListAction>}
        description={t('pickup.description')}
        title={t('pickup.title')}
      />
      <ListToolbar
        search={<ListSearch isDisabled={!pickup.storeId} label={t('pickup.search')} value={query} onChange={setQuery} />}
        filters={<FilterButtons groups={groups} />}
      />
      <FilterChips groups={groups} />
      {panel()}
      {pickup.dialog}
      {sheet && pickup.storeId && <PickupPointSheet key={sheet.place?.id ?? 'new'} place={sheet.place} storeId={pickup.storeId} onClose={() => setSheet(null)} />}
    </div>
  )
}
