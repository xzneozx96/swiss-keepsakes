import type { PinListItem } from '@sk/api-contract'
import type { ListFilters } from '../lib/list'
import type { RowActionId } from './place-rows'
import type { MessageKey } from '@/i18n/en'

import { Button, buttonVariants, SearchField } from '@heroui/react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import { EmptyState } from '@/components/empty-state'
import { filterGroup, FilterToolbar } from '@/components/filter-bar'
import { ContentIcon, InfoIcon, PlusIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { useCategories } from '@/features/categories/api/queries'
import { ApiProblem } from '@/features/data-client/errors'
import { useMe } from '@/features/stores/api/queries'
import { currentStore } from '@/features/stores/lib/current-store'
import { apiEnabled } from '@/lib/api-mode'
import { usePlaces } from '../api/queries'
import { usePlaceActions } from '../hooks/use-place-actions'
import { DATE_FILTERS, filterItems, isFiltered, NO_CATEGORY, noFilters, STATUSES } from '../lib/list'
import { NEW_PLACE_ID, PLACES_PATH } from '../lib/search-params'
import { PlaceRows } from './place-rows'

function Header({ disabled }: { disabled: boolean }) {
  const { t } = useLocale()

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-title">{t('places.list.title')}</h1>
        <p className="text-sm text-pretty text-muted">{t('places.list.intro')}</p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Link aria-disabled={disabled} className={buttonVariants({ className: 'min-h-11', variant: 'secondary' })} params={{ placeId: NEW_PLACE_ID }} search={{ start: 'dates' }} to="/store/content/places/$placeId">
          <PlusIcon aria-hidden size={18} />
          {t('places.list.addEvent')}
        </Link>
        <Link aria-disabled={disabled} className={buttonVariants({ className: 'min-h-11' })} params={{ placeId: NEW_PLACE_ID }} to="/store/content/places/$placeId">
          <PlusIcon aria-hidden size={18} />
          {t('places.list.addPlace')}
        </Link>
      </div>
    </div>
  )
}

function Filters({ items, filters, categories, onChange }: {
  items: PinListItem[]
  filters: ListFilters
  categories: { id: string, label: string }[]
  onChange: (next: ListFilters) => void
}) {
  const { t } = useLocale()
  const count = (test: (item: PinListItem) => boolean) => items.filter(test).length

  return (
    <FilterToolbar
      groups={[
        filterGroup({
          id: 'status',
          label: t('places.filter.status'),
          options: STATUSES.map(id => ({ id, label: t(`places.status.${id}` as MessageKey), count: count(item => item.status === id) })),
          selected: filters.status as (typeof STATUSES)[number][],
          onChange: status => onChange({ ...filters, status }),
        }),
        filterGroup({
          id: 'category',
          label: t('places.filter.category'),
          options: [...categories, { id: NO_CATEGORY, label: t('places.filter.noCategory') }].map(option => ({ ...option, count: count(item => (option.id === NO_CATEGORY ? item.categoryIds.length === 0 : item.categoryIds.includes(option.id))) })),
          selected: filters.category,
          onChange: category => onChange({ ...filters, category }),
        }),
        filterGroup({
          id: 'stay',
          label: t('places.filter.stay'),
          options: (['short_stay', 'multi_day', 'both'] as const).map(id => ({ id, label: t(`places.stay.${id}`), count: count(item => item.stayTag === id) })),
          selected: filters.stay as ('short_stay' | 'multi_day' | 'both')[],
          onChange: stay => onChange({ ...filters, stay }),
        }),
        filterGroup({
          id: 'dates',
          label: t('places.filter.dates'),
          options: DATE_FILTERS.map(id => ({ id, label: t(id === 'has' ? 'places.filter.hasDates' : 'places.filter.noDates'), count: count(item => item.hasDates === (id === 'has')) })),
          selected: filters.dates as (typeof DATE_FILTERS)[number][],
          onChange: dates => onChange({ ...filters, dates }),
        }),
      ]}
    />
  )
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
  const actions = usePlaceActions(store?.storeId ?? '')
  const all = places.data?.items ?? []
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
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchField aria-label={t('places.list.search')} className="w-full lg:w-80" isDisabled={places.isPending} value={filters.query} onChange={query => setFilters({ ...filters, query })}>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder={t('places.list.search')} />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        <div className="min-w-0 lg:flex-1">
          <Filters
            categories={(categories.data?.items ?? []).map(category => ({ id: category.id, label: category.name.en ?? category.name.de ?? '' }))}
            filters={filters}
            items={all}
            onChange={setFilters}
          />
        </div>
      </div>
      {actions.notice && <p className="rounded-2xl bg-danger-soft p-4 text-sm text-danger-soft-foreground" role="alert">{t(actions.notice)}</p>}
      {places.isError
        ? (
            <div className="flex flex-col items-start gap-2 rounded-2xl bg-danger-soft p-4 text-sm text-danger-soft-foreground" role="alert">
              <p>{t(places.error instanceof ApiProblem && places.error.type === 'forbidden' ? 'places.problem.forbidden' : 'places.loadFailed')}</p>
              {places.error instanceof ApiProblem && places.error.requestId && <p className="text-xs opacity-80">{t('places.requestId', { id: places.error.requestId })}</p>}
              <Button className="min-h-11" variant="secondary" onPress={() => void places.refetch()}>{t('places.retry')}</Button>
            </div>
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
