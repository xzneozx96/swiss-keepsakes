import type { PickupPlace } from '@sk/api-contract'

import { Button, Skeleton } from '@heroui/react'
import { useState } from 'react'

import { EmptyState } from '@/components/empty-state'
import { FilterButtons, FilterChips, filterGroup } from '@/components/filter-bar'
import { PickupIcon, PlusIcon } from '@/components/icons'
import { MerchantPageHeader } from '@/components/layout/merchant-page-header'
import { useLocale } from '@/contexts/locale-context'
import { apiEnabled } from '@/lib/api-mode'
import { usePickupPoints } from '../hooks/use-pickup-points'
import { PickupPointSheet } from './pickup-point-sheet'
import { PickupPoints } from './pickup-points'

type PickupView = 'active' | 'archived'

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
  // Both ticked shows both; none ticked is no filter, the same as both.
  const [view, setView] = useState<PickupView[]>(['active'])
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
    const showing = [
      ...(!view.length || view.includes('active') ? places(false) : []),
      ...(!view.length || view.includes('archived') ? places(true) : []),
    ]

    return showing.length
      ? <PickupPoints label={t('pickup.title')} places={showing} onArchive={pickup.archive} onOpen={place => setSheet({ place })} onRestore={pickup.restore} />
      : <EmptyState icon={PickupIcon} message={t(view.length === 1 && view[0] === 'archived' ? 'products.empty.archived' : 'products.empty.pickup')} />
  }

  return (
    <div className="flex flex-col gap-4" data-testid="pickup-page">
      <MerchantPageHeader
        // The screen's one red action, as M15's "Add partner".
        action={(
          <Button className="shrink-0 max-lg:min-h-11" isDisabled={!pickup.storeId} size="sm" onPress={() => setSheet({})}>
            <PlusIcon aria-hidden size={16} />
            {t('pickup.action.add')}
          </Button>
        )}
        description={t('pickup.description')}
        title={t('pickup.title')}
      />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <FilterButtons groups={groups} />
      </div>
      <FilterChips groups={groups} />
      {panel()}
      {pickup.dialog}
      {sheet && pickup.storeId && <PickupPointSheet key={sheet.place?.id ?? 'new'} place={sheet.place} storeId={pickup.storeId} onClose={() => setSheet(null)} />}
    </div>
  )
}
