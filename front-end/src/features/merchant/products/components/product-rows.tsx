import type { ProductRow } from "../hooks/use-merchant-products";
import type { DataTableColumn } from "@/components/data-table";
import type { EmptyStateProps } from "@/components/empty-state";
import type { RowAction } from "@/components/row-actions";

import { LanguageChip, MaintenanceChip, PublishChip } from "./status-chips";

import { ArchiveIcon, EditIcon, RestoreIcon } from "@/components/icons";
import { DataTable } from "@/components/data-table";
import { RowActions } from "@/components/row-actions";
import { Media } from "@/components/media";
import { StatusChip } from "@/components/status-chip";
import { useLocale } from "@/contexts/locale-context";

export type ProductAction = "edit" | "archive" | "restore";

interface ProductRowsProps {
  rows: ProductRow[];
  /** Accessible name of the list or table: the selected tab. */
  label: string;
  /** Table headers: name, status, then the three facts. */
  columns: [string, string, string, string, string];
  onAction: (row: ProductRow, action: ProductAction) => void;
  /** Shown inside the table (a card on phones) when `rows` is empty. */
  empty?: EmptyStateProps;
  /** Back to page 1 when this changes. */
  resetKey?: string;
  isLoading?: boolean;
}

/** Edit and archive (or restore), in a ⋯ menu as on M15, so a tap on a row never archives. */
function MoreMenu({
  row,
  onAction,
}: {
  row: ProductRow;
  onAction: ProductRowsProps["onAction"];
}) {
  const { t } = useLocale();
  const actions: RowAction<ProductAction>[] = [
    { id: "edit", label: t("products.action.edit"), icon: EditIcon },
    row.archived
      ? {
          id: "restore",
          label: t("products.action.restore"),
          icon: RestoreIcon,
        }
      : {
          id: "archive",
          label: t("products.action.archive"),
          icon: ArchiveIcon,
        },
  ];

  return (
    <RowActions
      actions={actions}
      label={t("products.action.more", { name: row.name })}
      onAction={(id) => onAction(row, id)}
    />
  );
}

/** "Archived" in place of the publish chip. */
function StateChip({ row }: { row: ProductRow }) {
  const { t } = useLocale();

  return row.archived ? (
    <StatusChip tone="neutral">{t("products.archived")}</StatusChip>
  ) : (
    <>
      <PublishChip published={row.published} />
      {row.maintenance && <MaintenanceChip />}
    </>
  );
}

/**
 * Phones: one card per gift or tour in the M03 ticket shape (1.10b/c). Photo, name and meta
 * where M03 has the date tile and guest; the publish and language chips; the price,
 * availability and commission in the dashed footer, one fact per row. The card opens M12/M13.
 */
function StackedRows({ rows, label, onAction }: ProductRowsProps) {
  return (
    <ul aria-label={label} className="flex flex-col gap-5 lg:hidden">
      {rows.map((row) => (
        <li key={row.id}>
          <article className="relative flex flex-col overflow-hidden rounded-3xl bg-surface shadow-surface card-hover">
            <div className="flex items-center gap-4 p-4">
              <Media
                alt=""
                className="size-14 shrink-0 rounded-lg"
                photo={row.photo}
              />
              <div className="min-w-0 flex-1">
                <h3 className="text-lg leading-tight font-semibold break-words hyphens-auto">
                  {/* The whole card opens M12/M13; the menu sits above the stretched link. */}
                  <a
                    className="rounded-md outline-none after:absolute after:inset-0 focus-visible:focus-ring"
                    href={row.href}
                  >
                    {row.name}
                  </a>
                </h3>
                <p className="mt-2 text-xs text-muted">{row.meta}</p>
              </div>
              <div className="relative shrink-0">
                <MoreMenu row={row} onAction={onAction} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 px-4 pb-4 [&_svg]:shrink-0">
              <StateChip row={row} />
              <LanguageChip status={row.languages} />
            </div>
            <dl className="flex flex-col gap-2 border-t border-dashed border-separator px-4 py-3.5 text-sm">
              {row.facts.map((fact, index) => (
                <div
                  key={fact.label}
                  className="flex items-baseline justify-between gap-4"
                >
                  <dt className="shrink-0 text-muted">{fact.label}</dt>
                  <dd
                    className={`text-end tabular-nums ${
                      fact.isWarning
                        ? "text-warning"
                        : index === 0
                          ? "font-semibold"
                          : "text-muted"
                    }`}
                  >
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
          </article>
        </li>
      ))}
    </ul>
  );
}

export function ProductRows(props: ProductRowsProps) {
  const { columns: names, onAction } = props;
  const columns: DataTableColumn<ProductRow>[] = [
    {
      id: "name",
      header: names[0],
      headerClassName: "w-[36%]",
      isRowHeader: true,
      skeleton: "lead",
      render: (row) => (
        <div className="flex items-center gap-3">
          <Media
            alt=""
            className="size-10 shrink-0 rounded-lg"
            photo={row.photo}
          />
          <div className="flex min-w-0 flex-col">
            <a
              className="font-semibold break-words underline-offset-4 outline-none hover:underline focus-visible:focus-ring"
              href={row.href}
            >
              {row.name}
            </a>
            <span className="text-label text-muted">{row.meta}</span>
          </div>
        </div>
      ),
    },
    {
      id: "status",
      header: names[1],
      headerClassName: "w-[19%]",
      skeleton: "chip",
      cellClassName: "py-2",
      render: (row) => (
        <div className="flex flex-col items-start gap-1.5 [&_svg]:shrink-0">
          <StateChip row={row} />
          <LanguageChip status={row.languages} />
        </div>
      ),
    },
    ...[2, 3, 4].map((fact) => ({
      id: `fact-${fact}`,
      header: names[fact],
      headerClassName: fact === 4 ? "w-[12%]" : "w-[13%]",
      cellClassName: (row: ProductRow) =>
        `whitespace-nowrap tabular-nums ${row.facts[fact - 2]?.isWarning ? "text-warning" : ""}`,
      render: (row: ProductRow) => row.facts[fact - 2]?.value,
    })),
  ];

  return (
    // No row link: a press in the ⋯ menu would also open the row (as on M15).
    <DataTable
      cards={(page) => <StackedRows {...props} rows={page} />}
      columns={columns}
      contentClassName="table-fixed"
      empty={props.empty}
      getRowId={(row) => row.id}
      isLoading={props.isLoading}
      label={props.label}
      resetKey={props.resetKey}
      rowActions={{
        render: (row) => <MoreMenu row={row} onAction={onAction} />,
        headerClassName: "w-[7%]",
      }}
      rows={props.rows}
    />
  );
}
