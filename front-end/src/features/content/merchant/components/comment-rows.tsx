import type { CommentRowProps } from "../hooks/use-merchant-comments";
import type { DataTableColumn } from "@/components/data-table";
import type { EmptyStateProps } from "@/components/empty-state";
import type { RowAction } from "@/components/row-actions";

import { Button, Chip } from "@heroui/react";

import { ArchiveIcon, MessageIcon, TrashIcon } from "@/components/icons";
import { DataTable } from "@/components/data-table";
import { RowActions } from "@/components/row-actions";
import { StatusChip } from "@/components/status-chip";
import { useLocale } from "@/contexts/locale-context";

export type CommentAction = "reply" | "hide" | "show" | "delete";

interface CommentRowsProps {
  rows: CommentRowProps[];
  label: string;
  onAction: (row: CommentRowProps, action: CommentAction) => void;
  /** Shown inside the table (a card on phones) when `rows` is empty. */
  empty?: EmptyStateProps;
  /** Back to page 1 when this changes. */
  resetKey?: string;
  isLoading?: boolean;
}

function MoreMenu({
  row,
  onAction,
}: {
  row: CommentRowProps;
  onAction: CommentRowsProps["onAction"];
}) {
  const { t } = useLocale();
  const actions: RowAction<CommentAction>[] = [
    row.hidden
      ? {
          id: "show",
          label: t("merchantComments.action.show"),
          icon: ArchiveIcon,
        }
      : {
          id: "hide",
          label: t("merchantComments.action.hide"),
          icon: ArchiveIcon,
        },
    {
      id: "delete",
      label: t("merchantComments.action.delete"),
      icon: TrashIcon,
    },
  ];

  return (
    <RowActions
      actions={actions}
      label={t("merchantComments.action.more", { name: row.authorName })}
      onAction={(id) => onAction(row, id)}
    />
  );
}

function Author({ row }: { row: CommentRowProps }) {
  const { t } = useLocale();

  return (
    <div className="flex min-w-0 items-center gap-3">
      <img
        alt=""
        className="size-10 shrink-0 rounded-full bg-surface-secondary object-cover"
        src={row.avatar}
      />
      <div className="flex min-w-0 flex-col">
        <span className="flex min-w-0 items-center gap-2 font-semibold">
          <span className="truncate">{row.authorName}</span>
          {row.isShop && (
            <Chip size="sm" variant="secondary">
              <Chip.Label>{t("merchantContent.shop")}</Chip.Label>
            </Chip>
          )}
        </span>
        <span className="text-xs text-muted tabular-nums">{row.posted}</span>
      </div>
    </div>
  );
}

/** The state chip: hidden (by itself or with its thread), or the reply state of a comment. */
function State({ row }: { row: CommentRowProps }) {
  const { t, intlLocale } = useLocale();

  if (row.hidden)
    return (
      <StatusChip tone="neutral">{t("merchantComments.hidden")}</StatusChip>
    );
  if (row.hiddenWithThread)
    return (
      <StatusChip tone="neutral">
        {t("merchantComments.hiddenWithThread")}
      </StatusChip>
    );
  if (!row.canReply || row.isShop) return null;
  if (row.shopReplied)
    return (
      <StatusChip tone="success">
        {t("merchantComments.shopReplied")}
      </StatusChip>
    );

  return (
    <StatusChip tone="neutral">
      {row.replies
        ? t(
            new Intl.PluralRules(intlLocale).select(row.replies) === "one"
              ? "merchantComments.replies.one"
              : "merchantComments.replies.other",
            { count: row.replies },
          )
        : t("merchantComments.noReply")}
    </StatusChip>
  );
}

const articleLink =
  "rounded underline-offset-4 outline-none hover:underline focus-visible:focus-ring";

/**
 * Phones: one card per comment in the M03 ticket shape: the person and time first, the
 * comment, its state, then the story it belongs to under the dashed line, and the actions.
 */
function StackedRows({ rows, label, onAction }: CommentRowsProps) {
  const { t } = useLocale();

  return (
    <ul aria-label={label} className="flex flex-col gap-5 lg:hidden">
      {rows.map((row) => (
        <li key={row.id}>
          <article
            aria-label={row.authorName}
            className={`flex flex-col overflow-hidden rounded-3xl bg-surface shadow-surface ${
              row.hidden || row.hiddenWithThread
                ? "[&_.comment-text]:text-muted"
                : ""
            }`}
          >
            <div className="flex flex-col gap-3 p-4">
              <Author row={row} />
              {row.replyTo && (
                <p className="text-xs text-muted">
                  {t("merchantComments.replyTo", { name: row.replyTo })}
                </p>
              )}
              <p
                className="comment-text text-body [overflow-wrap:anywhere]"
                lang={row.article.language}
              >
                {row.text}
              </p>
              <div className="flex flex-wrap gap-1.5 [&_svg]:shrink-0">
                <State row={row} />
              </div>
            </div>
            <dl className="flex items-baseline justify-between gap-4 border-t border-dashed border-separator px-4 py-3.5 text-sm">
              <dt className="shrink-0 text-muted">
                {t("merchantComments.article")}
              </dt>
              <dd className="min-w-0 text-end">
                <a
                  className={articleLink}
                  href={row.article.href}
                  lang={row.article.language}
                >
                  {row.article.title}
                </a>
                <span className="ms-1.5 text-xs text-muted">
                  {row.article.code}
                </span>
              </dd>
            </dl>
            <div className="flex items-center justify-between gap-2 border-t border-separator px-4 py-2.5">
              {row.canReply ? (
                <Button
                  aria-label={t("merchantComments.replyTo", {
                    name: row.authorName,
                  })}
                  size="sm"
                  variant="tertiary"
                  onPress={() => onAction(row, "reply")}
                >
                  <MessageIcon aria-hidden size={16} />
                  {t("merchantComments.action.reply")}
                </Button>
              ) : (
                <span />
              )}
              <MoreMenu row={row} onAction={onAction} />
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}

/** From 1024px: a Table with the same facts and actions, as M03 and M15. */
export function CommentRows(props: CommentRowsProps) {
  const { t } = useLocale();
  const { onAction } = props;
  const columns: DataTableColumn<CommentRowProps>[] = [
    {
      id: "comment",
      header: t("merchantComments.column.comment"),
      skeleton: "two-line",
      isRowHeader: true,
      cellClassName: "py-3",
      render: (row) => (
        <div className="flex max-w-md flex-col gap-2">
          <Author row={row} />
          {row.replyTo && (
            <span className="text-xs text-muted">
              {t("merchantComments.replyTo", { name: row.replyTo })}
            </span>
          )}
          <p
            className="line-clamp-3 text-sm [overflow-wrap:anywhere]"
            lang={row.article.language}
          >
            {row.text}
          </p>
        </div>
      ),
    },
    {
      id: "article",
      header: t("merchantComments.column.article"),
      skeleton: "two-line",
      render: (row) => (
        <>
          <a
            className={articleLink}
            href={row.article.href}
            lang={row.article.language}
          >
            {row.article.title}
          </a>
          <span className="ms-1.5 text-xs text-muted">{row.article.code}</span>
        </>
      ),
    },
    {
      id: "status",
      header: t("merchantComments.column.status"),
      skeleton: "chip",
      cellClassName: "py-2",
      render: (row) => (
        <div className="flex flex-col items-start gap-1.5 [&_svg]:shrink-0">
          <State row={row} />
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
            {row.canReply && (
              <Button
                aria-label={t("merchantComments.replyTo", {
                  name: row.authorName,
                })}
                size="sm"
                variant="tertiary"
                onPress={() => onAction(row, "reply")}
              >
                <MessageIcon aria-hidden size={16} />
                {t("merchantComments.action.reply")}
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
