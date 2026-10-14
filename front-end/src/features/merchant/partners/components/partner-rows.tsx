import { Button, Dropdown, Label, Table } from "@heroui/react";

import {
  ArchiveIcon,
  ChevronRightIcon,
  MoreIcon,
  QrIcon,
  TrashIcon,
} from "@/components/icons";
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
  const items: { id: PartnerAction; label: string; icon: typeof TrashIcon }[] =
    row.isArchived
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
    <Dropdown>
      <Button
        isIconOnly
        aria-label={t("merchantPartners.action.more", { name: row.name })}
        size="sm"
        variant="tertiary"
      >
        <MoreIcon size={18} />
      </Button>
      <Dropdown.Popover placement="bottom end">
        <Dropdown.Menu
          aria-label={t("merchantPartners.action.more", { name: row.name })}
          onAction={(key) => onAction(row, key as PartnerAction)}
        >
          {items.map((item) => (
            <Dropdown.Item key={item.id} id={item.id} textValue={item.label}>
              <item.icon aria-hidden size={16} />
              <Label>{item.label}</Label>
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
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
          <article className="relative flex flex-col overflow-hidden rounded-3xl bg-surface shadow-surface hover:bg-surface-secondary">
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
function PartnerTable({ rows, label, onAction }: PartnerRowsProps) {
  const { t } = useLocale();

  return (
    <Table className="hidden lg:block">
      <Table.ScrollContainer>
        <Table.Content aria-label={label}>
          <Table.Header>
            <Table.Column isRowHeader>
              {t("merchantPartners.column.partner")}
            </Table.Column>
            <Table.Column>{t("merchantPartners.column.opens")}</Table.Column>
            <Table.Column>{t("merchantPartners.conversion")}</Table.Column>
            <Table.Column>
              {t("merchantPartners.column.transactions")}
            </Table.Column>
            <Table.Column>{t("merchantPartners.toPay")}</Table.Column>
            <Table.Column>
              <span className="sr-only">
                {t("merchantPartners.column.actions")}
              </span>
            </Table.Column>
          </Table.Header>
          <Table.Body>
            {rows.map((row) => (
              <Table.Row key={row.id}>
                <Table.Cell className="whitespace-nowrap">
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
                </Table.Cell>
                <Table.Cell className="tabular-nums">{row.opens}</Table.Cell>
                <Table.Cell className="whitespace-nowrap tabular-nums">
                  {row.conversion ?? "–"}
                </Table.Cell>
                <Table.Cell className="tabular-nums">
                  {row.transactions}
                </Table.Cell>
                <Table.Cell className="py-2">
                  <div className="flex flex-col items-start gap-1.5 [&_svg]:shrink-0">
                    <span className="font-semibold tabular-nums">
                      {row.toPay}
                    </span>
                    {row.toOffset && (
                      <StatusChip tone="neutral">
                        {t("merchantPartners.toOffset.chip", {
                          amount: row.toOffset,
                        })}
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
                </Table.Cell>
                <Table.Cell>
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
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}

export function PartnerRows(props: PartnerRowsProps) {
  return (
    <>
      <StackedRows {...props} />
      <PartnerTable {...props} />
    </>
  );
}
