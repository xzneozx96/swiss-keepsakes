import type { PinListItem } from '@sk/api-contract'
import type { ListFilters } from '../lib/list'
import type { RowActionId } from './place-rows'
import type { MessageKey } from '@/i18n/en'

import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import { EmptyState } from '@/components/empty-state'
import { ErrorNotice } from '@/components/error-notice'
import { FilterButtons, FilterChips, filterGroup } from '@/components/filter-bar'
import { ContentIcon, InfoIcon, PlusIcon } from '@/components/icons'
import { ListAction, ListHeader, ListSearch, ListToolbar } from '@/components/layout/list-toolbar'
import { Notice } from '@/components/notice'
import { useLocale } from '@/contexts/locale-context'
import { useCategories } from '@/features/categories/api/queries'
import { ApiProblem } from '@/features/data-client/errors'
import { useMe } from '@/features/stores/api/queries'
import { currentStore } from '@/features/stores/lib/current-store'
import { apiEnabled } from '@/lib/api-mode'
import { usePlaces } from '../api/queries'
import { usePlaceActions } from '../hooks/use-place-actions'
import { filterItems, isFiltered, NO_CATEGORY, noFilters, STATUSES, TYPE_FILTERS } from '../lib/list'
import { NEW_PLACE_ID, PLACES_PATH } from '../lib/search-params'
import { PlaceRows } from './place-rows'

function Header({ disabled }: { disabled: boolean }) {
  const { t } = useLocale()

  return (
    <ListHeader
      action={(
        <div className="flex shrink-0 gap-2 max-lg:flex-col">
          <ListAction icon={PlusIcon} isDisabled={disabled} link={{ params: { placeId: NEW_PLACE_ID }, search: { start: 'dates' }, to: '/store/content/places/$placeId' }} variant="secondary">{t('places.list.addEvent')}</ListAction>
          <ListAction icon={PlusIcon} isDisabled={disabled} link={{ params: { placeId: NEW_PLACE_ID }, to: '/store/content/places/$placeId' }}>{t('places.list.addPlace')}</ListAction>
        </div>
      )}
      description={t('places.list.intro')}
      title={t('places.list.title')}
    />
  )
}

/** Each count is what ticking the option shows: the search and the other groups apply, this group's own ticks do not. */
function usePlaceFilterGroups(items: PinListItem[], filters: ListFilters, categories: { id: string, label: string, parentId?: string }[], onChange: (patch: Partial<ListFilters>) => void) {
  const { t } = useLocale()
  const count = (group: keyof Omit<ListFilters, 'query'>, ...ids: string[]) => filterItems(items, { ...filters, [group]: ids }).length

  return [
    filterGroup({
      id: 'status',
      label: t('places.filter.status'),
      options: STATUSES.map(id => ({ id, label: t(`places.status.${id}` as MessageKey), count: count('status', id) })),
      selected: filters.status as (typeof STATUSES)[number][],
      onChange: status => onChange({ status }),
    }),
    filterGroup({
      id: 'category',
      label: t('places.filter.category'),
      // Ticking a parent ticks its children too (the filter bar keeps them in one list), so its count is the union.
      options: [...categories, { id: NO_CATEGORY, label: t('places.filter.noCategory') }].map(option => ({ ...option, count: count('category', option.id, ...categories.filter(child => child.parentId === option.id).map(child => child.id)) })),
      selected: filters.category,
      onChange: category => onChange({ category }),
    }),
    filterGroup({
      id: 'stay',
      label: t('places.filter.stay'),
      options: (['short_stay', 'multi_day', 'both'] as const).map(id => ({ id, label: t(`places.stay.${id}`), count: count('stay', id) })),
      selected: filters.stay as ('short_stay' | 'multi_day' | 'both')[],
      onChange: stay => onChange({ stay }),
    }),
    filterGroup({
      id: 'type',
      label: t('places.filter.type'),
      options: TYPE_FILTERS.map(id => ({ id, label: t(`places.type.${id}` as MessageKey), count: count('type', id) })),
      selected: filters.type as (typeof TYPE_FILTERS)[number][],
      onChange: type => onChange({ type }),
    }),
  ]
}

/**
 * N16, Content > Places: every pin of the store with its status, a search and filters, the table from 1024 px and
 * cards below it. Add place and Add event both open the editor on a new pin. The places work with the live API only.
 */
export function PlacesScreen() {
  const { t } = useLocale()
  const navigate = useNavigate()
  const me = useMe(apiEnabled)
  const store = currentStore(me.data)
  const places = usePlaces(store?.storeId)
  const categories = useCategories(store?.storeId, 'map')
  const [filters, setFilters] = useState(noFilters)
  const change = (patch: Partial<ListFilters>) => setFilters(current => ({ ...current, ...patch }))
  const actions = usePlaceActions(store?.storeId ?? '')
  const all = places.data?.items ?? []
  const groups = usePlaceFilterGroups(all, filters, (categories.data?.items ?? []).map(category => ({ id: category.id, label: category.name.en ?? category.name.de ?? '', parentId: category.parentId ?? undefined })), change)
  const shown = filterItems(all, filters)
  const label = t('places.table.label')

  if (!apiEnabled)
    return <EmptyState icon={InfoIcon} message={t('places.apiOnly')} />
  if (me.isError) {
    const status = me.error instanceof ApiProblem ? me.error.status : undefined

    return <EmptyState icon={InfoIcon} message={t(status === 401 || status === undefined ? 'places.loadFailed' : 'places.problem.forbidden')} />
  }
  if (!me.isPending && !store)
    return <EmptyState icon={InfoIcon} message={t('places.noStore')} />

  const onAction = (item: PinListItem, action: RowActionId) => {
    if (action === 'edit')
      void navigate({ to: `${PLACES_PATH}/${item.id}` as never })
    else if (action === 'hide')
      actions.hide(item)
    else if (action === 'unhide')
      actions.unhide(item)
    else
      actions.remove(item)
  }

  return (
    <div className="flex flex-col gap-4" data-testid="places-screen">
      <Header disabled={!store} />
      <ListToolbar
        search={<ListSearch isDisabled={places.isPending} label={t('places.list.search')} value={filters.query} onChange={query => change({ query })} />}
        filters={<FilterButtons groups={groups} />}
      />
      <FilterChips groups={groups} />
      {actions.notice && <Notice status="danger">{t(actions.notice)}</Notice>}
      {places.isError
        ? (
            <ErrorNotice
              reference={places.error instanceof ApiProblem ? places.error.requestId : undefined}
              message={t(places.error instanceof ApiProblem && places.error.type === 'forbidden' ? 'places.problem.forbidden' : 'places.loadFailed')}
              onRetry={() => void places.refetch()}
            />
          )
        : (
            <>
              {places.isPending && <p aria-live="polite" className="sr-only" role="status">{t('places.loading')}</p>}
              <PlaceRows
                busy={actions.busy}
                categories={categories.data?.items ?? []}
                empty={{ icon: ContentIcon, message: t(isFiltered(filters) ? 'places.empty.filtered' : 'places.empty.all') }}
                isLoading={places.isPending || !store}
                items={shown}
                label={label}
                resetKey={JSON.stringify(filters)}
                onAction={onAction}
              />
            </>
          )}
      {actions.dialog}
    </div>
  )
}
