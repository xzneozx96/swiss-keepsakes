import type { ProductListItem } from '@sk/api-contract'
import type { KeepsakeFilters, StatusFilter } from '../lib/list'
import type { DataTableColumn } from '@/components/data-table'
import type { MessageKey } from '@/i18n/en'

import { Button, buttonVariants, SearchField, Skeleton } from '@heroui/react'
import { dateTimeFormat } from '@sk/domain/shared'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'

import { DataTable } from '@/components/data-table'
import { FilterButtons, FilterChips, filterGroup } from '@/components/filter-bar'
import { EditIcon, GiftIcon, PlusIcon } from '@/components/icons'
import { MerchantPageHeader } from '@/components/layout/merchant-page-header'
import { RowActions } from '@/components/row-actions'
import { StatusChip } from '@/components/status-chip'
import { useLocale } from '@/contexts/locale-context'
import { useKeepsakes } from '../api/queries'
import { nameIn, statusOf, variantSummary } from '../lib/keepsake-rules'
import { filterKeepsakes, isFiltered, noFilters, STATUS_FILTERS } from '../lib/list'
import { NEW_KEEPSAKE_PATH } from '../lib/search-params'
import { KeepsakeGate } from './keepsake-gate'
import { KeepsakeNotice } from './keepsake-notice'
import { KeepsakePhoto } from './keepsake-photo'

const editHref = (id: string) => `/store/products/gifts/${id}`

function useRowText() {
  const { t, language, intlLocale } = useLocale()

  return {
    t,
    edited: (item: ProductListItem) => dateTimeFormat(intlLocale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(item.updatedAt)),
    name: (item: ProductListItem) => nameIn(item.name, language) || t('keepsakes.untitled'),
    summary: (item: ProductListItem) => variantSummary(t, item.variantCount, item.soldOutCount),
  }
}

function RowMenu({ item }: { item: ProductListItem }) {
  const { t, name } = useRowText()

  return (
    <RowActions
      actions={[{ id: 'edit', label: t('keepsakes.list.edit'), icon: EditIcon, href: editHref(item.id) }]}
      label={t('keepsakes.list.actions', { name: name(item) })}
    />
  )
}

function Status({ item }: { item: ProductListItem }) {
  const { t } = useRowText()
  const status = statusOf(item)

  return <StatusChip tone={status.tone}>{t(status.key)}</StatusChip>
}

/** Phones: a row is the thumbnail, the name (two lines at most) over the variants, the status chip with the last update, and the ⋯ menu. */
function KeepsakeCards({ items, label }: { items: ProductListItem[], label: string }) {
  const { name, summary, edited } = useRowText()

  return (
    <ul aria-label={label} className="flex flex-col gap-3 lg:hidden">
      {items.map(item => (
        <li key={item.id} className="flex items-center gap-1 rounded-3xl bg-surface p-3 shadow-surface" data-keepsake={item.id}>
          <Link className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl outline-none focus-visible:focus-ring" params={{ productId: item.id }} to="/store/products/gifts/$productId">
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
          <RowMenu item={item} />
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
function KeepsakeRows({ items, isLoading, label, empty, resetKey }: { items: ProductListItem[], isLoading: boolean, label: string, empty: string, resetKey: string }) {
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
      cards={pageItems => <KeepsakeCards items={pageItems} label={label} />}
      columns={columns}
      empty={{ icon: GiftIcon, message: empty }}
      getRowHref={item => editHref(item.id)}
      getRowId={item => item.id}
      isLoading={isLoading}
      label={label}
      resetKey={resetKey}
      rowActions={{ render: item => <RowMenu item={item} /> }}
      rows={items}
    />
  )
}

/** Each count is what ticking the option shows: the search applies, this group's own ticks do not. */
function useStatusGroup(items: ProductListItem[], filters: KeepsakeFilters, onChange: (patch: Partial<KeepsakeFilters>) => void) {
  const { t } = useLocale()
  const labels: Record<StatusFilter, MessageKey> = { draft: 'keepsakes.status.draft', published: 'keepsakes.status.published', editsNotLive: 'keepsakes.status.editsNotLive' }

  return filterGroup({
    id: 'status',
    label: t('keepsakes.filter.status'),
    options: STATUS_FILTERS.map(id => ({ id, label: t(labels[id]), count: filterKeepsakes(items, { ...filters, status: [id] }).length })),
    selected: filters.status,
    onChange: status => onChange({ status }),
  })
}

/** The search, the Status filter and the applied chips, then the table and, when a search or filter hides every row, a way back. */
function KeepsakeBody({ items, isLoading, filters, onChange, failure }: { items: ProductListItem[], isLoading: boolean, filters: KeepsakeFilters, onChange: (patch: Partial<KeepsakeFilters>) => void, failure?: React.ReactNode }) {
  const { t } = useLocale()
  const group = useStatusGroup(items, filters, onChange)
  const shown = filterKeepsakes(items, filters)
  const noMatch = items.length > 0 && shown.length === 0 && isFiltered(filters)

  return (
    <>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchField aria-label={t('keepsakes.list.search')} className="w-full lg:w-80" isDisabled={isLoading} value={filters.query} onChange={query => onChange({ query })}>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder={t('keepsakes.list.search')} />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        <FilterButtons groups={[group]} />
      </div>
      <FilterChips groups={[group]} />
      {failure
        ?? (
          <>
            <KeepsakeRows empty={t(noMatch ? 'keepsakes.list.emptyFiltered' : 'keepsakes.list.empty')} isLoading={isLoading} items={shown} label={t('keepsakes.title')} resetKey={JSON.stringify(filters)} />
            {noMatch && (
              <Button className="min-h-11 self-center" variant="secondary" onPress={() => onChange(noFilters)}>{t('keepsakes.list.clear')}</Button>
            )}
          </>
        )}
    </>
  )
}

function KeepsakeTable({ storeId, filters, onChange }: { storeId: string, filters: KeepsakeFilters, onChange: (patch: Partial<KeepsakeFilters>) => void }) {
  const list = useKeepsakes(storeId)

  return (
    <KeepsakeBody
      filters={filters}
      failure={list.isError ? <KeepsakeNotice error={list.error} onRetry={() => void list.refetch()} /> : undefined}
      isLoading={list.isPending}
      items={list.data?.items ?? []}
      onChange={onChange}
    />
  )
}

/** M11: the store's keepsakes (no tours, no category filter) with a search and a Status filter. Create starts the create flow. */
export function KeepsakeList() {
  const { t } = useLocale()
  const [filters, setFilters] = useState(noFilters)
  const change = (patch: Partial<KeepsakeFilters>) => setFilters(current => ({ ...current, ...patch }))

  return (
    <div className="flex flex-col gap-4" data-testid="keepsake-list">
      <MerchantPageHeader
        action={(
          <Link className={`${buttonVariants({ size: 'sm' })} shrink-0 max-lg:min-h-11`} to={NEW_KEEPSAKE_PATH}>
            <PlusIcon aria-hidden size={16} />
            {t('keepsakes.create')}
          </Link>
        )}
        description={t('keepsakes.list.description')}
        title={t('keepsakes.title')}
      />
      <KeepsakeGate fallback={<KeepsakeBody isLoading filters={filters} items={[]} onChange={change} />}>
        {storeId => <KeepsakeTable filters={filters} storeId={storeId} onChange={change} />}
      </KeepsakeGate>
    </div>
  )
}
