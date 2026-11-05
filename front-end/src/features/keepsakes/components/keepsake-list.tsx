import type { ProductList, ProductListItem } from '@sk/api-contract'
import type { KeepsakesSearch, StatusFilter } from '../lib/list'
import type { DataTableColumn } from '@/components/data-table'
import type { PagerState } from '@/components/list-pagination'
import type { MessageKey } from '@/i18n/en'

import { Button, Skeleton } from '@heroui/react'
import { dateTimeFormat } from '@sk/domain/shared'
import { Link } from '@tanstack/react-router'
import { useCallback } from 'react'

import { DataTable } from '@/components/data-table'
import { FilterButtons, FilterChips, filterGroup } from '@/components/filter-bar'
import { EditIcon, GiftIcon, PlusIcon, TrashIcon } from '@/components/icons'
import { ListAction, ListHeader, ListSearch, ListToolbar } from '@/components/layout/list-toolbar'
import { serverPager } from '@/components/list-pagination'
import { RowActions } from '@/components/row-actions'
import { StatusChip } from '@/components/status-chip'
import { useLocale } from '@/contexts/locale-context'
import { useLastPageFallback } from '@/hooks/use-last-page-fallback'
import { useListLoading } from '@/hooks/use-list-loading'
import { useSearchBox } from '@/hooks/use-search-box'
import { useKeepsakes } from '../api/queries'
import { useRemoveKeepsake } from '../hooks/use-remove-keepsake'
import { nameIn, statusOf, variantSummary } from '../lib/keepsake-rules'
import { isFiltered, KEEPSAKES_PAGE_SIZE, STATUS_FILTERS } from '../lib/list'
import { NEW_KEEPSAKE_PATH } from '../lib/search-params'
import { KeepsakeGate } from './keepsake-gate'
import { KeepsakeNotice } from './keepsake-notice'
import { KeepsakePhoto } from './keepsake-photo'

const editHref = (id: string) => `/store/products/${id}`

function useRowText() {
  const { t, language, intlLocale } = useLocale()

  return {
    t,
    edited: (item: ProductListItem) => dateTimeFormat(intlLocale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(item.updatedAt)),
    name: (item: ProductListItem) => nameIn(item.name, language) || t('keepsakes.untitled'),
    summary: (item: ProductListItem) => variantSummary(t, item.variantCount, item.soldOutCount),
  }
}

type OnRemove = (item: ProductListItem) => void

/** An archived keepsake can no longer be changed or removed, so its row has no menu. */
function RowMenu({ item, onRemove }: { item: ProductListItem, onRemove?: OnRemove }) {
  const { t, name } = useRowText()

  if (item.status === 'archived')
    return null

  return (
    <RowActions
      actions={[
        { id: 'edit', label: t('keepsakes.list.edit'), icon: EditIcon, href: editHref(item.id) },
        { id: 'delete', label: t('keepsakes.remove.action'), icon: TrashIcon, isDanger: true },
      ]}
      label={t('keepsakes.list.actions', { name: name(item) })}
      onAction={id => id === 'delete' && onRemove?.(item)}
    />
  )
}

function Status({ item }: { item: ProductListItem }) {
  const { t } = useRowText()
  const status = statusOf(item)

  return <StatusChip tone={status.tone}>{t(status.key)}</StatusChip>
}

/** Phones: a row is the thumbnail, the name (two lines at most) over the variants, the status chip with the last update, and the ⋯ menu. */
function KeepsakeCards({ items, label, onRemove }: { items: ProductListItem[], label: string, onRemove?: OnRemove }) {
  const { name, summary, edited } = useRowText()

  return (
    <ul aria-label={label} className="flex flex-col gap-3 lg:hidden">
      {items.map(item => (
        <li key={item.id} className="flex items-center gap-1 rounded-3xl bg-surface p-3 shadow-surface" data-keepsake={item.id}>
          <Link className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl outline-none focus-visible:focus-ring" params={{ productId: item.id }} to="/store/products/$productId">
            <KeepsakePhoto className="size-14 shrink-0 rounded-xl" media={item.cover} width={160} />
            <span className="flex min-w-0 flex-col">
              <span className="line-clamp-2 text-sm font-semibold [overflow-wrap:anywhere]">{name(item)}</span>
              <span className="text-label text-muted">{summary(item)}</span>
              <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                <Status item={item} />
                <span className="text-label text-muted">{edited(item)}</span>
              </span>
            </span>
          </Link>
          <RowMenu item={item} onRemove={onRemove} />
        </li>
      ))}
    </ul>
  )
}

/** The loading rows have the shape of the cards: a thumbnail, the name and variants lines, the status chip with the update line, and the menu. */
function CardSkeletons() {
  return (
    <ul aria-hidden className="flex flex-col gap-3 lg:hidden">
      {[0, 1, 2].map(i => (
        <li key={i} className="flex items-center gap-3 rounded-3xl bg-surface p-3 shadow-surface">
          <Skeleton className="size-14 shrink-0 rounded-xl" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-3/5 rounded-lg" />
            <Skeleton className="h-3 w-1/3 rounded-lg" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-24 rounded-full" />
              <Skeleton className="h-3 w-16 rounded-lg" />
            </div>
          </div>
          <Skeleton className="size-8 shrink-0 rounded-full" />
        </li>
      ))}
    </ul>
  )
}

/** From 1024 px a table, below it the cards. */
function KeepsakeRows({ items, isLoading, label, empty, paging, onRemove }: { items: ProductListItem[], isLoading: boolean, label: string, empty: string, paging: PagerState, onRemove?: OnRemove }) {
  const { t, name, summary, edited } = useRowText()
  const columns: DataTableColumn<ProductListItem>[] = [
    {
      id: 'keepsake',
      header: t('keepsakes.list.column.keepsake'),
      isRowHeader: true,
      skeleton: 'lead',
      render: item => (
        <div className="flex min-w-0 items-center gap-3">
          <KeepsakePhoto className="size-11 shrink-0 rounded-lg" media={item.cover} width={160} />
          <span className="font-semibold [overflow-wrap:anywhere]">{name(item)}</span>
        </div>
      ),
    },
    { id: 'variants', header: t('keepsakes.list.column.variants'), cellClassName: 'whitespace-nowrap', render: summary },
    { id: 'status', header: t('keepsakes.list.column.status'), skeleton: 'chip', cellClassName: 'whitespace-nowrap', render: item => <Status item={item} /> },
    { id: 'edited', header: t('keepsakes.list.column.edited'), headerClassName: 'whitespace-nowrap', cellClassName: 'whitespace-nowrap text-muted', render: edited },
  ]

  return (
    <DataTable
      cardSkeleton={<CardSkeletons />}
      cards={pageItems => <KeepsakeCards items={pageItems} label={label} onRemove={onRemove} />}
      columns={columns}
      empty={{ icon: GiftIcon, message: empty }}
      getRowHref={item => editHref(item.id)}
      getRowId={item => item.id}
      isLoading={isLoading}
      label={label}
      paging={paging}
      rowActions={{ render: item => <RowMenu item={item} onRemove={onRemove} /> }}
      rows={items}
    />
  )
}

const NO_COUNTS = { draft: 0, published: 0, editsNotLive: 0, archived: 0 }

/** Each count comes from the API: what ticking the option shows, the search applied, this group's own ticks not. */
function useStatusGroup(counts: Record<StatusFilter, number>, search: KeepsakesSearch, onChange: (patch: Partial<KeepsakesSearch>) => void) {
  const { t } = useLocale()
  const labels: Record<StatusFilter, MessageKey> = { draft: 'keepsakes.status.draft', published: 'keepsakes.status.published', editsNotLive: 'keepsakes.status.editsNotLive', archived: 'keepsakes.status.archived' }

  return filterGroup({
    id: 'status',
    label: t('keepsakes.filter.status'),
    options: STATUS_FILTERS.map(id => ({ id, label: t(labels[id]), count: counts[id] })),
    selected: search.status ?? [],
    onChange: status => onChange({ status: status.length > 0 ? status : undefined, page: undefined }),
  })
}

/** The search, the Status filter and the applied chips, then the table and, when a search or filter hides every row, a way back. */
function KeepsakeBody({ list, loading, search, onSearch, failure, onRemove }: { list?: ProductList, loading: boolean, search: KeepsakesSearch, onSearch: (patch: Partial<KeepsakesSearch>) => void, failure?: React.ReactNode, onRemove?: OnRemove }) {
  const { t } = useLocale()
  const page = search.page ?? 1
  const group = useStatusGroup(list?.statuses ?? NO_COUNTS, search, onSearch)
  const shown = list?.items ?? []
  const noMatch = list !== undefined && shown.length === 0 && isFiltered(search)
  const commitSearch = useCallback((text: string) => onSearch({ q: text.trim() ? text : undefined, page: undefined }), [onSearch])
  const [text, setText] = useSearchBox(search.q ?? '', commitSearch)
  const goToPage = useCallback((next: number) => onSearch({ page: next > 1 ? next : undefined }), [onSearch])

  return (
    <>
      <ListToolbar
        search={<ListSearch isDisabled={list === undefined && loading} label={t('keepsakes.list.search')} value={text} onChange={setText} />}
        filters={<FilterButtons groups={[group]} />}
      />
      <FilterChips groups={[group]} />
      {failure
        ?? (
          <>
            <KeepsakeRows empty={t(noMatch ? 'keepsakes.list.emptyFiltered' : 'keepsakes.list.empty')} isLoading={loading} items={shown} label={t('keepsakes.title')} paging={serverPager({ page, pageSize: KEEPSAKES_PAGE_SIZE, total: list?.total ?? 0, go: goToPage })} onRemove={onRemove} />
            {noMatch && (
              <Button className="min-h-11 self-center" variant="secondary" onPress={() => onSearch({ status: undefined, q: undefined, page: undefined })}>{t('keepsakes.list.clear')}</Button>
            )}
          </>
        )}
    </>
  )
}

function KeepsakeTable({ storeId, search, onSearch }: { storeId: string, search: KeepsakesSearch, onSearch: (patch: Partial<KeepsakesSearch>) => void }) {
  const page = search.page ?? 1
  const list = useKeepsakes(storeId, { status: search.status?.join(','), q: search.q?.trim() || undefined, page, pageSize: KEEPSAKES_PAGE_SIZE })
  // A new filter, search or page keeps the last rows on screen until the answer is late, then the skeleton takes over.
  const loading = useListLoading(list)
  const { t, language } = useLocale()
  const remove = useRemoveKeepsake(storeId)
  const goToPage = useCallback((next: number) => onSearch({ page: next > 1 ? next : undefined }), [onSearch])

  useLastPageFallback(list.data && !list.isPlaceholderData ? { rows: list.data.items.length, total: list.data.total } : undefined, page, KEEPSAKES_PAGE_SIZE, goToPage)

  return (
    <>
      <KeepsakeBody
        failure={list.isError ? <KeepsakeNotice error={list.error} onRetry={() => void list.refetch()} /> : undefined}
        list={list.data}
        loading={loading}
        search={search}
        onRemove={item => remove.ask({ id: item.id, name: nameIn(item.name, language) || t('keepsakes.untitled'), rowVersion: item.rowVersion, hasOrders: item.hasOrders })}
        onSearch={onSearch}
      />
      {remove.dialog}
    </>
  )
}

/** M11: the store's keepsakes (no tours, no category filter) with a search and a Status filter, paged by the server. The filter, the search and the page are in the URL. Create starts the create flow. */
export function KeepsakeList({ search, onSearch }: { search: KeepsakesSearch, onSearch: (patch: Partial<KeepsakesSearch>) => void }) {
  const { t } = useLocale()

  return (
    <div className="flex flex-col gap-4" data-testid="keepsake-list">
      <ListHeader
        action={<ListAction icon={PlusIcon} link={{ to: NEW_KEEPSAKE_PATH }}>{t('keepsakes.create')}</ListAction>}
        description={t('keepsakes.list.description')}
        title={t('keepsakes.title')}
      />
      <KeepsakeGate fallback={<KeepsakeBody loading search={search} onSearch={onSearch} />}>
        {storeId => <KeepsakeTable search={search} storeId={storeId} onSearch={onSearch} />}
      </KeepsakeGate>
    </div>
  )
}
