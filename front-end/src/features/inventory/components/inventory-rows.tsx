import type { StockRow } from '@sk/api-contract'
import type { DataTableColumn } from '@/components/data-table'

import { Skeleton } from '@heroui/react'

import { DataTable } from '@/components/data-table'
import { OrdersIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { KeepsakePhoto } from '@/features/keepsakes/components/keepsake-photo'
import { nameIn } from '@/features/keepsakes/lib/keepsake-rules'
import { isSoldOut } from '../lib/list'
import { StockField } from './stock-field'

function useRowText() {
  const { t, language } = useLocale()
  const keepsake = (row: StockRow) => nameIn(row.keepsakeName, language) || t('inventory.untitled')
  const variant = (row: StockRow) => nameIn(row.variantTitle, language)

  return { t, keepsake, variant }
}

/** Thumbnail, the variant's title (the keepsake's name when it has no options), the keepsake's name, and below 1280 px the code. */
function VariantCell({ row, showCode }: { row: StockRow, showCode: boolean }) {
  const { keepsake, variant } = useRowText()
  const title = variant(row) || keepsake(row)

  return (
    <div className="flex min-w-0 items-center gap-3">
      <KeepsakePhoto className="size-11 shrink-0 rounded-xl" media={row.photo} width={160} />
      <span className="flex min-w-0 flex-col break-words">
        <span className="text-sm font-medium">{title}</span>
        {showCode && row.code && <span className="font-mono text-xs text-muted xl:hidden">{row.code}</span>}
        {variant(row) && <span className="text-xs text-muted">{keepsake(row)}</span>}
      </span>
    </div>
  )
}

/** "Sold out" in the danger colour and bold when nothing is available, else the figure. */
function Available({ row }: { row: StockRow }) {
  const { t } = useRowText()

  return <span className={isSoldOut(row) ? 'font-semibold text-danger' : ''}>{isSoldOut(row) ? t('inventory.soldOut') : row.available}</span>
}

/** Phones: the two stock lines, "{n} available" (or "Sold out" in the danger colour) and, when orders reserve units, "{n} reserved" muted, never joined. */
function StockLines({ row }: { row: StockRow }) {
  const { t } = useRowText()

  return (
    <span className="flex flex-col pt-1.5 text-sm tabular-nums">
      <span className={`whitespace-nowrap ${isSoldOut(row) ? 'font-medium text-danger' : ''}`}>{isSoldOut(row) ? t('inventory.soldOut') : t('inventory.available', { count: row.available })}</span>
      {row.reserved > 0 && <span className="text-xs whitespace-nowrap text-muted">{t('inventory.reserved', { count: row.reserved })}</span>}
    </span>
  )
}

/** Phones: a row is the thumbnail, the title and the code, and under them the two stock lines on the left and the box on the right. */
function StockCards({ rows, label, storeId }: { rows: StockRow[], label: string, storeId: string }) {
  return (
    <ul aria-label={label} className="flex flex-col divide-y divide-separator lg:hidden">
      {rows.map(row => (
        <li key={row.skuId} className="flex min-w-0 flex-col gap-2 py-3" data-sku={row.skuId}>
          <div className="min-w-0">
            <VariantCell row={row} showCode={false} />
          </div>
          <div className="flex items-start justify-between gap-3 ps-14">
            <StockLines row={row} />
            <StockField row={row} storeId={storeId} />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** The loading rows have the shape of the phone rows: a thumbnail with two lines, then the stock lines and the box. */
function CardSkeletons() {
  return (
    <ul aria-hidden className="flex flex-col divide-y divide-separator lg:hidden">
      {[0, 1, 2].map(i => (
        <li key={i} className="flex flex-col gap-2 py-3">
          <div className="flex items-center gap-3">
            <Skeleton className="size-11 shrink-0 rounded-xl" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-3/5 rounded-lg" />
              <Skeleton className="h-3 w-1/3 rounded-lg" />
            </div>
          </div>
          <div className="flex items-start justify-between gap-3 ps-14">
            <div className="flex flex-col gap-1.5 pt-1.5">
              <Skeleton className="h-4 w-20 rounded-lg" />
              <Skeleton className="h-3 w-14 rounded-lg" />
            </div>
            <Skeleton className="h-11 w-40 rounded-xl" />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** From 1024 px the table, below it the list. Widths are the content plus the cell's 16px padding each side: the longest code is 118px, the box 160px, "Reserved" and "Sold out" about 56px. */
export function StockRows({ rows, isLoading, storeId, empty, resetKey }: { rows: StockRow[], isLoading: boolean, storeId: string, empty: string, resetKey: string }) {
  const { t } = useRowText()
  const label = t('inventory.title')
  const columns: DataTableColumn<StockRow>[] = [
    { id: 'variant', header: t('inventory.column.variant'), isRowHeader: true, skeleton: 'lead', render: row => <VariantCell row={row} showCode /> },
    { id: 'code', header: t('inventory.column.code'), headerClassName: 'hidden w-38 xl:table-cell', cellClassName: 'hidden xl:table-cell', render: row => <span className="font-mono text-sm">{row.code}</span> },
    { id: 'reserved', header: t('inventory.column.reserved'), headerClassName: 'w-28 text-end', cellClassName: row => `text-end tabular-nums ${row.reserved === 0 ? 'text-muted' : ''}`, render: row => row.reserved },
    { id: 'inStock', header: t('inventory.column.inStock'), headerClassName: 'w-48', skeleton: 'field', render: row => <StockField key={row.skuId} row={row} storeId={storeId} /> },
    { id: 'available', header: t('inventory.column.available'), headerClassName: 'w-28 text-end', cellClassName: 'text-end tabular-nums', render: row => <Available row={row} /> },
  ]

  return (
    <DataTable
      cardSkeleton={<CardSkeletons />}
      cards={pageRows => <StockCards label={label} rows={pageRows} storeId={storeId} />}
      columns={columns}
      contentClassName="min-w-[40rem] table-fixed"
      empty={{ icon: OrdersIcon, message: empty }}
      getRowId={row => row.skuId}
      isLoading={isLoading}
      label={label}
      resetKey={resetKey}
      rows={rows}
      variant="card"
    />
  )
}
