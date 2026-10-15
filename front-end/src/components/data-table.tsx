import type { EmptyStateProps } from "@/components/empty-state";
import type { ReactNode } from "react";
import type { SkeletonShape } from "@/components/data-table-skeleton";

import { Table } from "@heroui/react";

import {
  SKELETON_ROWS,
  SkeletonCell,
  TicketSkeletons,
} from "@/components/data-table-skeleton";
import { EmptyState, TableEmptyState } from "@/components/empty-state";
import { Pager, usePaged } from "@/components/list-pagination";
import { useLocale } from "@/contexts/locale-context";

export interface DataTableColumn<T> {
  id: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  isRowHeader?: boolean;
  /** What the cells hold, so the loading bars match; default one line. */
  skeleton?: SkeletonShape;
  /** Width or alignment of the column, e.g. "w-[36%]" or "text-end". */
  headerClassName?: string;
  cellClassName?: string | ((row: T) => string);
}

interface DataTableProps<T> {
  /** Accessible name of the table: the selected tab or filter. */
  label: string;
  columns: DataTableColumn<T>[];
  /** Every row; the table cuts them into pages of 10. */
  rows: T[];
  getRowId: (row: T) => string;
  /** Makes the whole row a link. */
  getRowHref?: (row: T) => string;
  /** Back to page 1 when this changes, e.g. on a new tab, filter or search. */
  resetKey?: string;
  /**
   * Phones: the card list for one page of rows. Without it the table shows at every width;
   * with it the table shows from 1024px and the same pager sits under the cards.
   */
  cards?: (pageRows: T[]) => ReactNode;
  /** Shown inside the table when `rows` is empty, and as a card on phones. */
  empty?: EmptyStateProps;
  /** Draws the real headers with column-shaped bars (and loading tickets on phones). */
  isLoading?: boolean;
  /**
   * The trailing Actions column: usually a `RowActions` ⋯ menu. A row with `getRowHref` stays
   * a link everywhere but on this cell.
   */
  rowActions?: {
    render: (row: T) => ReactNode;
    /** Width of the column; default "w-24". */
    headerClassName?: string;
  };
  /**
   * Where the table sits. "page" (default) is a table on its own, in HeroUI's default look;
   * "card" is for a table inside a widget with a heading, which draws the plain rows
   * (HeroUI's secondary variant) because the widget already is the card (owner 15.10.2026).
   */
  variant?: "page" | "card";
  className?: string;
  /** Classes for the table element itself, e.g. "table-fixed". */
  contentClassName?: string;
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
  empty,
  isLoading,
  rowActions,
  variant,
  className,
  contentClassName,
}: DataTableProps<T>) {
  const { t } = useLocale();
  const { pageItems, pager } = usePaged(rows, resetKey);
  const isOnPage = variant !== "card";
  const allColumns: DataTableColumn<T>[] = rowActions
    ? [
        ...columns,
        {
          id: "actions",
          header: t("table.actions"),
          skeleton: "action",
          headerClassName: `${rowActions.headerClassName ?? "w-24"} text-end`,
          render: (row) => (
            <div className="flex justify-end">{rowActions.render(row)}</div>
          ),
        },
      ]
    : columns;
  const tableClass = [cards && "hidden lg:block", className]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      {cards &&
        (isLoading ? (
          <TicketSkeletons />
        ) : (
          <>
            {empty && !rows.length && (
              <div className="lg:hidden">
                <EmptyState {...empty} />
              </div>
            )}
            {cards(pageItems)}
            <div className="lg:hidden">
              <Pager compact pager={pager} />
            </div>
          </>
        ))}
      <Table
        className={tableClass || undefined}
        variant={isOnPage ? undefined : "secondary"}
      >
        <Table.ScrollContainer>
          <Table.Content aria-label={label} className={contentClassName}>
            <Table.Header>
              {allColumns.map((column) => (
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
              {isLoading &&
                Array.from({ length: SKELETON_ROWS }, (_, index) => (
                  <Table.Row key={`loading-${index}`}>
                    {allColumns.map((column) => (
                      <Table.Cell key={column.id}>
                        <SkeletonCell index={index} shape={column.skeleton} />
                      </Table.Cell>
                    ))}
                  </Table.Row>
                ))}
              {!isLoading &&
                pageItems.map((row) => (
                  <Table.Row
                    key={getRowId(row)}
                    className={getRowHref ? "cursor-pointer" : undefined}
                    href={getRowHref?.(row)}
                  >
                    {allColumns.map((column) => (
                      <Table.Cell
                        key={column.id}
                        className={
                          typeof column.cellClassName === "function"
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
        {!isLoading && pager.pages > 1 && (
          <Table.Footer>
            <Pager pager={pager} />
          </Table.Footer>
        )}
      </Table>
    </>
  );
}
