import type { ReactNode } from 'react'
import type { SkeletonShape } from '@/components/data-table-skeleton'
import type { EmptyStateProps } from '@/components/empty-state'

import { Table } from '@heroui/react'
import { useEffect, useRef } from 'react'

import {
  SKELETON_ROWS,
  SkeletonCell,
  TicketSkeletons,
} from '@/components/data-table-skeleton'
import { EmptyState, TableEmptyState } from '@/components/empty-state'
import { Pager, usePaged } from '@/components/list-pagination'
import { useLocale } from '@/contexts/locale-context'

export interface DataTableColumn<T> {
  id: string
  header: ReactNode
  render: (row: T) => ReactNode
  isRowHeader?: boolean
  /** What the cells hold, so the loading bars match; default one line. */
  skeleton?: SkeletonShape
  /** Width or alignment of the column, e.g. "w-[36%]" or "text-end". */
  headerClassName?: string
  cellClassName?: string | ((row: T) => string)
}

/**
 * Wide enough for the usual columns to keep their widths; below it the HeroUI scroll container
 * scrolls sideways (HeroUI's docs give the table a min width for the same reason).
 */
const MIN_WIDTH_CLASS = 'min-w-[56rem]'
/** A caller's own `min-w-*` replaces the default (the classes are not merged, so both would fight). */
const HAS_MIN_WIDTH = /(?:^|\s)min-w-/

/**
 * Pins the Actions column at the end with Tailwind `sticky` (HeroUI v3 has no sticky props).
 * The background repeats the table's own so scrolled cells pass under it: the header's, and the
 * row's at rest and on hover (HeroUI: `bg-surface`, and `surface/40` or `default/50` over the
 * backdrop, written here as the opaque mix).
 */
const PINNED_HEADER_CLASS = {
  page: 'sticky end-0 z-10 bg-surface-secondary',
  // A card table's header is see-through over the card, so its pinned cell takes the card's colour.
  card: 'sticky end-0 z-10 bg-surface',
}
const PINNED_CELL_CLASS = 'sticky end-0 z-10 bg-surface'
const PINNED_CELL_HOVER = {
  page: 'in-data-[hovered=true]:bg-[color-mix(in_oklab,var(--surface)_40%,var(--surface-secondary))]',
  card: 'in-data-[hovered=true]:bg-[color-mix(in_oklab,var(--default)_50%,var(--surface))]',
}

interface DataTableProps<T> {
  /** Accessible name of the table: the selected tab or filter. */
  label: string
  columns: DataTableColumn<T>[]
  /** Every row; the table cuts them into pages of 10 unless `hidePager` is set. */
  rows: T[]
  getRowId: (row: T) => string
  /** Makes the whole row a link. */
  getRowHref?: (row: T) => string
  /** Back to page 1 when this changes, e.g. on a new tab, filter or search. */
  resetKey?: string
  /**
   * Phones: the card list for one page of rows. Without it the table shows at every width;
   * with it the table shows from 1024px and the same pager sits under the cards.
   */
  cards?: (pageRows: T[]) => ReactNode
  /** Phones: the loading state of `cards`; default is the generic ticket skeleton. A list whose cards differ passes one with their shape. */
  cardSkeleton?: ReactNode
  /** Shows every row in one list, with no pager, for a grouped list that must not be cut into pages. */
  hidePager?: boolean
  /** Shown inside the table when `rows` is empty, and as a card on phones. */
  empty?: EmptyStateProps
  /** Draws the real headers with column-shaped bars (and loading tickets on phones). */
  isLoading?: boolean
  /**
   * The trailing Actions column: usually a `RowActions` ⋯ menu. A row with `getRowHref` stays
   * a link everywhere but on this cell.
   */
  rowActions?: {
    render: (row: T) => ReactNode
    /** Width of the column; default "w-24". */
    headerClassName?: string
  }
  /**
   * Where the table sits. "page" (default) is a table on its own, in HeroUI's default look;
   * "card" is for a table inside a widget with a heading, which draws the plain rows
   * (HeroUI's secondary variant) because the widget already is the card (owner 15.10.2026).
   */
  variant?: 'page' | 'card'
  className?: string
  /** Classes for the table element itself, e.g. "table-fixed"; a `min-w-*` replaces the default minimum width. */
  contentClassName?: string
}

/**
 * The one table of the app: HeroUI Table with its own empty state and the pager in its
 * footer. Callers describe the columns; the markup, empty state and paging live here.
 */
export function DataTable<T>({
  label,
  columns,
  rows,
  getRowId,
  getRowHref,
  resetKey,
  cards,
  cardSkeleton,
  hidePager,
  empty,
  isLoading,
  rowActions,
  variant,
  className,
  contentClassName,
}: DataTableProps<T>) {
  const { t } = useLocale()
  const gridRef = useRef<HTMLTableElement>(null)
  const { pageItems: pagedItems, pager } = usePaged(rows, resetKey)
  const pageItems = hidePager ? rows : pagedItems
  const isOnPage = variant !== 'card'
  const allColumns: DataTableColumn<T>[] = rowActions
    ? [
        ...columns,
        {
          id: 'actions',
          header: t('table.actions'),
          skeleton: 'action',
          headerClassName: `${rowActions.headerClassName ?? 'w-24'} text-end ${PINNED_HEADER_CLASS[isOnPage ? 'page' : 'card']}`,
          cellClassName: `${PINNED_CELL_CLASS} ${PINNED_CELL_HOVER[isOnPage ? 'page' : 'card']}`,
          render: row => (
            <div className="flex justify-end">{rowActions.render(row)}</div>
          ),
        },
      ]
    : columns
  const contentClasses = contentClassName && HAS_MIN_WIDTH.test(contentClassName)
    ? contentClassName
    : [MIN_WIDTH_CLASS, contentClassName].filter(Boolean).join(' ')
  // React Aria's table drops `aria-busy` from its props, so it is set on the grid element itself.
  useEffect(() => {
    if (isLoading)
      gridRef.current?.setAttribute('aria-busy', 'true')
    else gridRef.current?.removeAttribute('aria-busy')
  }, [isLoading])
  const tableClass = [cards && 'hidden lg:block', className]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      {cards
        && (isLoading
          ? (
              (cardSkeleton ?? <TicketSkeletons />)
            )
          : (
              <>
                {empty && !rows.length && (
                  <div className="lg:hidden">
                    <EmptyState {...empty} />
                  </div>
                )}
                {cards(pageItems)}
                {!hidePager && (
                  <div className="lg:hidden">
                    <Pager compact pager={pager} />
                  </div>
                )}
              </>
            ))}
      <Table
        className={tableClass || undefined}
        variant={isOnPage ? undefined : 'secondary'}
      >
        <Table.ScrollContainer>
          <Table.Content
            ref={gridRef}
            aria-label={label}
            className={contentClasses}
          >
            <Table.Header>
              {allColumns.map(column => (
                <Table.Column
                  key={column.id}
                  className={column.headerClassName}
                  isRowHeader={column.isRowHeader}
                >
                  {column.header}
                </Table.Column>
              ))}
            </Table.Header>
            <Table.Body
              renderEmptyState={
                empty && !isLoading
                  ? () => <TableEmptyState {...empty} />
                  : undefined
              }
            >
              {isLoading
                && Array.from({ length: SKELETON_ROWS }, (_, index) => (
                  <Table.Row key={`loading-${index}`}>
                    {allColumns.map(column => (
                      <Table.Cell key={column.id}>
                        <SkeletonCell index={index} shape={column.skeleton} />
                      </Table.Cell>
                    ))}
                  </Table.Row>
                ))}
              {!isLoading
                && pageItems.map(row => (
                  <Table.Row
                    key={getRowId(row)}
                    className={getRowHref ? 'cursor-pointer' : undefined}
                    href={getRowHref?.(row)}
                  >
                    {allColumns.map(column => (
                      <Table.Cell
                        key={column.id}
                        className={
                          typeof column.cellClassName === 'function'
                            ? column.cellClassName(row)
                            : column.cellClassName
                        }
                      >
                        {column.render(row)}
                      </Table.Cell>
                    ))}
                  </Table.Row>
                ))}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
        {!isLoading && !hidePager && pager.pages > 1 && (
          <Table.Footer>
            <Pager pager={pager} />
          </Table.Footer>
        )}
      </Table>
    </>
  )
}
