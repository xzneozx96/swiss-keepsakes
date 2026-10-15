import type { DataTableColumn } from "@/components/data-table";
import type { EmptyStateProps } from "@/components/empty-state";
import type { RowAction } from "@/components/row-actions";

import { Button } from "@heroui/react";

import {
  ArchiveIcon,
  ChevronRightIcon,
  QrIcon,
  TrashIcon,
} from "@/components/icons";
import { DataTable } from "@/components/data-table";
import { RowActions } from "@/components/row-actions";
import { StatusChip } from "@/components/status-chip";
import { useLocale } from "@/contexts/locale-context";

export interface PartnerRowProps {
  id: string;
  /** Opens M16 partner detail. */
  href: string;
  name: string;
  /** Referral code in /r/{code}; also searched. */
  code: string;
  email: string;
  /** "Hotel", "Guide" or "Other". */
  kind: string;
  /** Link opens in the last 30 days; a QR scan only counts as an open (S12). */
  opens: number;
  transactions: number;
  /** Transactions per link open over the last 30 days, "7%"; null without opens. */
  conversion: string | null;
  /** Still to pay after offsets, in Rappen, for sorting and the To pay filter. */
  toPayAmount: number;
  toPay: string;
  /** Overpayment still to offset, or null; shown beside "to pay", never as a negative amount. */
  toOffset: string | null;
  linkRevoked: boolean;
  isArchived: boolean;
  /** No link opens and no transactions: may be deleted rather than archived (D17). */
  canDelete: boolean;
}

export type PartnerAction = "qr" | "archive" | "restore" | "delete";

interface PartnerRowsProps {
  rows: PartnerRowProps[];
  label: string;
  onAction: (row: PartnerRowProps, action: PartnerAction) => void;
  /** Shown inside the table (a card on phones) when `rows` is empty. */
  empty?: EmptyStateProps;
  /** Back to page 1 when this changes. */
  resetKey?: string;
  isLoading?: boolean;
}

/** Archive, restore or delete, in a menu so a tap on the card never removes anything. */
function MoreMenu({
  row,
  onAction,
}: {
  row: PartnerRowProps;
  onAction: PartnerRowsProps["onAction"];
}) {
  const { t } = useLocale();
  const actions: RowAction<PartnerAction>[] = row.isArchived
    ? [
        {
          id: "restore",
          label: t("merchantPartners.action.restore"),
          icon: ArchiveIcon,
        },
      ]
    : [
        row.canDelete
          ? {
              id: "delete",
              label: t("merchantPartners.action.delete"),
              icon: TrashIcon,
            }
          : {
              id: "archive",
              label: t("merchantPartners.action.archive"),
              icon: ArchiveIcon,
            },
      ];

  return (
    <RowActions
      actions={actions}
      label={t("merchantPartners.action.more", { name: row.name })}
      onAction={(id) => onAction(row, id)}
    />
  );
}

/**
 * Phones: one card per partner in the M03 ticket shape (1.10b/c). The side tile holds the
 * 30-day link opens where M03 holds the pickup date; the dashed footer holds what is still
 * to pay where M03 holds the order total. The name links to M16 and its hit area covers the
 * card; the QR and More buttons sit above it.
 */
function StackedRows({ rows, label, onAction }: PartnerRowsProps) {
  const { t } = useLocale();

  return (
    <ul aria-label={label} className="flex flex-col gap-5 lg:hidden">
      {rows.map((row) => (
        <li key={row.id}>
          <article className="relative flex flex-col overflow-hidden rounded-3xl bg-surface shadow-surface card-hover">
            <div className="flex items-center gap-4 p-4">
              <div className="flex w-24 shrink-0 flex-col items-center border-e border-separator pe-4 text-center">
                <span className="text-[11px] leading-tight font-medium uppercase">
                  {t("merchantPartners.opens.short")}
                </span>
                <span className="text-3xl leading-tight font-semibold tabular-nums">
                  {row.opens}
                </span>
                <span className="text-xs text-muted">
                  {t("merchantPartners.opens.window")}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg leading-tight font-semibold">
                  <a
                    className="rounded-md outline-none after:absolute after:inset-0 focus-visible:focus-ring"
                    href={row.href}
                  >
                    {row.name}
                  </a>
                </h3>
                <p className="mt-2 text-xs text-muted">
                  {row.kind}
                  <span aria-hidden className="mx-2 text-border">
                    ·
                  </span>
                  <span className="whitespace-nowrap">
                    {t(
                      row.transactions === 1
                        ? "merchantPartners.transactions.one"
                        : "merchantPartners.transactions.other",
                      { count: row.transactions },
                    )}
                  </span>
                </p>
              </div>
              <ChevronRightIcon
                aria-hidden
                className="shrink-0 text-muted"
                size={18}
              />
            </div>
            <div className="flex flex-col gap-2 border-t border-dashed border-separator px-4 py-3.5">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="text-muted">
                  {t("merchantPartners.toPay")}
                </span>
                <span className="font-semibold tabular-nums">{row.toPay}</span>
              </div>
              <dl className="flex flex-col gap-2 text-sm">
                {row.toOffset && (
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="shrink-0 text-muted">
                      {t("merchantPartners.toOffset")}
                    </dt>
                    <dd className="text-end text-muted tabular-nums">
                      {row.toOffset}
                    </dd>
                  </div>
                )}
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="shrink-0 text-muted">
                    {t("merchantPartners.conversion")}
                  </dt>
                  <dd className="text-end whitespace-nowrap text-muted tabular-nums">
                    {row.conversion ?? "–"}
                  </dd>
                </div>
              </dl>
              {(row.linkRevoked || row.isArchived) && (
                <div className="flex flex-wrap gap-1.5 pt-1 [&_svg]:shrink-0">
                  {row.isArchived && (
                    <StatusChip tone="neutral">
                      {t("merchantPartners.archived")}
                    </StatusChip>
                  )}
                  {row.linkRevoked && !row.isArchived && (
                    <StatusChip tone="neutral">
                      {t("merchantPartners.reportLink.revokedChip")}
                    </StatusChip>
                  )}
                </div>
              )}
            </div>
            <div className="relative flex items-center justify-between gap-2 border-t border-separator px-4 py-2.5">
              {row.isArchived ? (
                <span className="text-xs text-muted">
                  {t("merchantPartners.archivedHint")}
                </span>
              ) : (
                <Button
                  size="sm"
                  variant="tertiary"
                  onPress={() => onAction(row, "qr")}
                >
                  <QrIcon aria-hidden size={16} />
                  {t("merchantPartners.action.qr")}
                </Button>
              )}
              <MoreMenu row={row} onAction={onAction} />
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}

/** From 1024px: a Table with the same facts and actions, as M03. */
export function PartnerRows(props: PartnerRowsProps) {
  const { t } = useLocale();
  const { onAction } = props;
  const columns: DataTableColumn<PartnerRowProps>[] = [
    {
      id: "partner",
      header: t("merchantPartners.column.partner"),
      isRowHeader: true,
      skeleton: "two-line",
      cellClassName: "whitespace-nowrap",
      render: (row) => (
        <div className="flex flex-col">
          <a
            className="font-semibold underline-offset-4 outline-none hover:underline focus-visible:focus-ring"
            href={row.href}
          >
            {row.name}
          </a>
          <span className="text-label text-muted">
            {row.kind} · {row.code}
          </span>
        </div>
      ),
    },
    {
      id: "opens",
      header: t("merchantPartners.column.opens"),
      cellClassName: "tabular-nums",
      render: (row) => row.opens,
    },
    {
      id: "conversion",
      header: t("merchantPartners.conversion"),
      cellClassName: "whitespace-nowrap tabular-nums",
      render: (row) => row.conversion ?? "–",
    },
    {
      id: "transactions",
      header: t("merchantPartners.column.transactions"),
      cellClassName: "tabular-nums",
      render: (row) => row.transactions,
    },
    {
      id: "toPay",
      header: t("merchantPartners.toPay"),
      skeleton: "two-line",
      cellClassName: "py-2",
      render: (row) => (
        <div className="flex flex-col items-start gap-1.5 [&_svg]:shrink-0">
          <span className="font-semibold tabular-nums">{row.toPay}</span>
          {row.toOffset && (
            <StatusChip tone="neutral">
              {t("merchantPartners.toOffset.chip", { amount: row.toOffset })}
            </StatusChip>
          )}
          {row.isArchived ? (
            <StatusChip tone="neutral">
              {t("merchantPartners.archived")}
            </StatusChip>
          ) : (
            row.linkRevoked && (
              <StatusChip tone="neutral">
                {t("merchantPartners.reportLink.revokedChip")}
              </StatusChip>
            )
          )}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      cards={(page) => <StackedRows {...props} rows={page} />}
      columns={columns}
      empty={props.empty}
      getRowId={(row) => row.id}
      isLoading={props.isLoading}
      label={props.label}
      resetKey={props.resetKey}
      rowActions={{
        render: (row) => (
          <div className="flex items-center justify-end gap-1">
            {!row.isArchived && (
              <Button
                isIconOnly
                aria-label={t("merchantPartners.action.qrFor", {
                  name: row.name,
                })}
                size="sm"
                variant="tertiary"
                onPress={() => onAction(row, "qr")}
              >
                <QrIcon size={18} />
              </Button>
            )}
            <MoreMenu row={row} onAction={onAction} />
          </div>
        ),
      }}
      rows={props.rows}
    />
  );
}
