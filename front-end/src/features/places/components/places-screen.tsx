import type { PinList, PinListItem } from '@sk/api-contract'
import type { PlacesSearch } from '../lib/search-params'
import type { RowActionId } from './place-rows'
import type { MessageKey } from '@/i18n/en'

import { useNavigate } from '@tanstack/react-router'
import { useCallback } from 'react'

import { EmptyState } from '@/components/empty-state'
import { ErrorNotice } from '@/components/error-notice'
import { FilterButtons, FilterChips, filterGroup } from '@/components/filter-bar'
import { ContentIcon, InfoIcon, PlusIcon } from '@/components/icons'
import { ListAction, ListHeader, ListSearch, ListToolbar } from '@/components/layout/list-toolbar'
import { serverPager } from '@/components/list-pagination'
import { Notice } from '@/components/notice'
import { useLocale } from '@/contexts/locale-context'
import { useCategories } from '@/features/categories/api/queries'
import { ApiProblem } from '@/features/data-client/errors'
import { useMe } from '@/features/stores/api/queries'
import { currentStore } from '@/features/stores/lib/current-store'
import { useLastPageFallback } from '@/hooks/use-last-page-fallback'
import { useListLoading } from '@/hooks/use-list-loading'
import { useSearchBox } from '@/hooks/use-search-box'
import { apiEnabled } from '@/lib/api-mode'
import { usePlaces } from '../api/queries'
import { usePlaceActions } from '../hooks/use-place-actions'
import { NO_CATEGORY, STATUSES, TYPE_FILTERS } from '../lib/list'
import { NEW_PLACE_ID, PLACES_PAGE_SIZE, PLACES_PATH } from '../lib/search-params'
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

const NO_COUNTS: Pick<PinList, 'statuses' | 'stays' | 'types' | 'categories'> = {
  statuses: { draft: 0, published: 0, hidden: 0, ended: 0 },
  stays: { short_stay: 0, multi_day: 0, both: 0 },
  types: { place: 0, event: 0 },
  categories: {},
}

type Group = 'status' | 'category' | 'stay' | 'type'

/** Each count comes from the API: what ticking the option shows, the search and the other groups applied, this group's own ticks not. */
function usePlaceFilterGroups(counts: typeof NO_COUNTS, search: PlacesSearch, categories: { id: string, label: string, parentId?: string }[], onChange: (patch: Partial<PlacesSearch>) => void) {
  const { t } = useLocale()
  const ticked = (group: Group) => (search[group] ?? []) as never[]
  const set = (group: Group) => (selected: string[]) => onChange({ [group]: selected.length > 0 ? selected : undefined, page: undefined })

  return [
    filterGroup({
      id: 'status',
      label: t('places.filter.status'),
      options: STATUSES.map(id => ({ id, label: t(`places.status.${id}` as MessageKey), count: counts.statuses[id] })),
      selected: ticked('status'),
      onChange: set('status'),
    }),
    filterGroup({
      id: 'category',
      label: t('places.filter.category'),
      // A parent's count includes its children, as the server counts it.
      options: [...categories, { id: NO_CATEGORY, label: t('places.filter.noCategory') }].map(option => ({ ...option, count: counts.categories[option.id] ?? 0 })),
      selected: ticked('category'),
      onChange: set('category'),
    }),
    filterGroup({
      id: 'stay',
      label: t('places.filter.stay'),
      options: (['short_stay', 'multi_day', 'both'] as const).map(id => ({ id, label: t(`places.stay.${id}`), count: counts.stays[id] })),
      selected: ticked('stay'),
      onChange: set('stay'),
    }),
    filterGroup({
      id: 'type',
      label: t('places.filter.type'),
      options: TYPE_FILTERS.map(id => ({ id, label: t(`places.type.${id}` as MessageKey), count: counts.types[id] })),
      selected: ticked('type'),
      onChange: set('type'),
    }),
  ]
}

const isFiltered = (search: PlacesSearch) => (search.q?.trim() ?? '') !== '' || [search.status, search.category, search.stay, search.type].some(group => (group?.length ?? 0) > 0)

/**
 * N16, Content > Places: the pins of the store with their status, a search and filters, the table from 1024 px and
 * cards below it. The server pages, filters and counts (ADR-033); the filters, the search and the page live in the URL. Add place and Add event both open the editor on a new pin. The places work with the live API only.
 */
export function PlacesScreen({ search, onSearch }: { search: PlacesSearch, onSearch: (patch: Partial<PlacesSearch>) => void }) {
  const { t } = useLocale()
  const navigate = useNavigate()
  const me = useMe(apiEnabled)
  const store = currentStore(me.data)
  const page = search.page ?? 1
  const places = usePlaces(store?.storeId, { status: search.status?.join(','), category: search.category?.join(','), stay: search.stay?.join(','), type: search.type?.join(','), q: search.q?.trim() || undefined, page, pageSize: PLACES_PAGE_SIZE })
  // A new filter, search or page keeps the last rows on screen until the answer is late, then the skeleton takes over.
  const loading = useListLoading(places)
  const categories = useCategories(store?.storeId, 'map')
  const commitSearch = useCallback((text: string) => onSearch({ q: text.trim() ? text : undefined, page: undefined }), [onSearch])
  const [text, setText] = useSearchBox(search.q ?? '', commitSearch)
  const actions = usePlaceActions(store?.storeId ?? '')
  const groups = usePlaceFilterGroups(places.data ?? NO_COUNTS, search, (categories.data?.items ?? []).map(category => ({ id: category.id, label: category.name.en ?? category.name.de ?? '', parentId: category.parentId ?? undefined })), onSearch)
  const shown = places.data?.items ?? []
  const goToPage = useCallback((next: number) => onSearch({ page: next > 1 ? next : undefined }), [onSearch])
  useLastPageFallback(places.data && !places.isPlaceholderData ? { rows: shown.length, total: places.data.total } : undefined, page, PLACES_PAGE_SIZE, goToPage)
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
        search={<ListSearch isDisabled={places.isPending} label={t('places.list.search')} value={text} onChange={setText} />}
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
                empty={{ icon: ContentIcon, message: t(isFiltered(search) ? 'places.empty.filtered' : 'places.empty.all') }}
                isLoading={loading || !store}
                items={shown}
                label={label}
                paging={serverPager({ page, pageSize: PLACES_PAGE_SIZE, total: places.data?.total ?? 0, go: goToPage })}
                onAction={onAction}
              />
            </>
          )}
      {actions.dialog}
    </div>
  )
}
