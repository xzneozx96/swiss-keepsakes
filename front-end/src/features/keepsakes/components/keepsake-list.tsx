import type { ProductListItem } from '@sk/api-contract'
import type { DataTableColumn } from '@/components/data-table'

import { buttonVariants, Skeleton } from '@heroui/react'
import { Link } from '@tanstack/react-router'

import { DataTable } from '@/components/data-table'
import { EditIcon, GiftIcon, PlusIcon } from '@/components/icons'
import { MerchantPageHeader } from '@/components/layout/merchant-page-header'
import { RowActions } from '@/components/row-actions'
import { StatusChip } from '@/components/status-chip'
import { useLocale } from '@/contexts/locale-context'
import { useKeepsakes } from '../api/queries'
import { nameIn, statusOf, variantSummary } from '../lib/keepsake-rules'
import { NEW_KEEPSAKE_PATH } from '../lib/search-params'
import { KeepsakeGate } from './keepsake-gate'
import { KeepsakeNotice } from './keepsake-notice'
import { KeepsakePhoto } from './keepsake-photo'

const editHref = (id: string) => `/store/products/gifts/${id}`

function useRowText() {
  const { t, language } = useLocale()

  return {
    t,
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

/** Phones: a row is the thumbnail, the name (two lines at most) over the variants, and the ⋯ menu. */
function KeepsakeCards({ items, label }: { items: ProductListItem[], label: string }) {
  const { name, summary } = useRowText()

  return (
    <ul aria-label={label} className="flex flex-col gap-3 lg:hidden">
      {items.map(item => (
        <li key={item.id} className="flex items-center gap-1 rounded-3xl bg-surface p-3 shadow-surface" data-keepsake={item.id}>
          <Link className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl outline-none focus-visible:focus-ring" params={{ productId: item.id }} to="/store/products/gifts/$productId">
            <KeepsakePhoto className="size-14 shrink-0 rounded-xl" media={item.cover} width={160} />
            <span className="flex min-w-0 flex-col">
              <span className="line-clamp-2 text-sm font-semibold [overflow-wrap:anywhere]">{name(item)}</span>
              <span className="text-label text-muted">{summary(item)}</span>
            </span>
          </Link>
          <RowMenu item={item} />
        </li>
      ))}
    </ul>
  )
}

/** The loading rows have the shape of the cards: a thumbnail and two lines. */
function CardSkeletons() {
  return (
    <ul aria-hidden className="flex flex-col gap-3 lg:hidden">
      {[0, 1, 2].map(i => (
        <li key={i} className="flex items-center gap-3 rounded-3xl bg-surface p-3 shadow-surface">
          <Skeleton className="size-14 shrink-0 rounded-xl" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-3/5 rounded-lg" />
            <Skeleton className="h-3 w-1/3 rounded-lg" />
          </div>
          <Skeleton className="size-8 shrink-0 rounded-full" />
        </li>
      ))}
    </ul>
  )
}

/** From 1024 px a table, below it the cards. */
function KeepsakeRows({ items, isLoading, label }: { items: ProductListItem[], isLoading: boolean, label: string }) {
  const { t, name, summary } = useRowText()
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
    {
      id: 'status',
      header: t('keepsakes.list.column.status'),
      skeleton: 'chip',
      cellClassName: 'whitespace-nowrap',
      render: (item) => {
        const status = statusOf(item)

        return <StatusChip tone={status.tone}>{t(status.key)}</StatusChip>
      },
    },
  ]

  return (
    <DataTable
      cardSkeleton={<CardSkeletons />}
      cards={pageItems => <KeepsakeCards items={pageItems} label={label} />}
      columns={columns}
      empty={{ icon: GiftIcon, message: t('keepsakes.list.empty') }}
      getRowHref={item => editHref(item.id)}
      getRowId={item => item.id}
      isLoading={isLoading}
      label={label}
      rowActions={{ render: item => <RowMenu item={item} /> }}
      rows={items}
    />
  )
}

function KeepsakeTable({ storeId }: { storeId: string }) {
  const { t } = useLocale()
  const list = useKeepsakes(storeId)

  return (
    <>
      {list.isError && <KeepsakeNotice error={list.error} onRetry={() => void list.refetch()} />}
      {!list.isError && <KeepsakeRows isLoading={list.isPending} items={list.data?.items ?? []} label={t('keepsakes.title')} />}
    </>
  )
}

/** M11: the store's keepsakes (no tours, no category filter). Create starts the create flow. */
export function KeepsakeList() {
  const { t } = useLocale()

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
      <KeepsakeGate fallback={<KeepsakeRows isLoading items={[]} label={t('keepsakes.title')} />}>
        {storeId => <KeepsakeTable storeId={storeId} />}
      </KeepsakeGate>
    </div>
  )
}
