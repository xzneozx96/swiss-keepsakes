import type { ReviewRowProps } from '../hooks/use-merchant-reviews'
import type { DataTableColumn } from '@/components/data-table'
import type { EmptyStateProps } from '@/components/empty-state'

import { Button } from '@heroui/react'

import { DataTable } from '@/components/data-table'
import { MessageIcon, ProfileEditIcon } from '@/components/icons'
import { Media } from '@/components/media'
import { Stars } from '@/components/rating'
import { RowActions } from '@/components/row-actions'
import { StatusChip } from '@/components/status-chip'
import { useLocale } from '@/contexts/locale-context'

interface ReviewRowsProps {
  rows: ReviewRowProps[]
  label: string
  onReply: (row: ReviewRowProps) => void
  /** Shown inside the table (a card on phones) when `rows` is empty. */
  empty?: EmptyStateProps
  /** Back to page 1 when this changes. */
  resetKey?: string
  isLoading?: boolean
}

function ReplyState({ row }: { row: ReviewRowProps }) {
  const { t } = useLocale()

  return row.reply
    ? (
        <StatusChip tone="success">
          {t('merchantReviews.status.replied')}
        </StatusChip>
      )
    : (
        <StatusChip tone="neutral">
          {t('merchantReviews.status.notReplied')}
        </StatusChip>
      )
}

/** Reply or edit reply: the only action. Reviews are never deleted (AC17). */
function ReplyButton({
  row,
  onReply,
}: {
  row: ReviewRowProps
  onReply: ReviewRowsProps['onReply']
}) {
  const { t } = useLocale()

  return (
    <Button
      aria-label={t(
        row.reply
          ? 'merchantReviews.action.editFor'
          : 'merchantReviews.action.replyTo',
        { name: row.guestName },
      )}
      size="sm"
      variant="tertiary"
      onPress={() => onReply(row)}
    >
      {row.reply
        ? (
            <ProfileEditIcon aria-hidden size={16} />
          )
        : (
            <MessageIcon aria-hidden size={16} />
          )}
      {t(
        row.reply
          ? 'merchantReviews.action.edit'
          : 'merchantReviews.action.reply',
      )}
    </Button>
  )
}

/** The shop's reply in the grey inset of the guest's own review (C15, 1.13t). */
function Reply({ reply }: { reply: NonNullable<ReviewRowProps['reply']> }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-surface-secondary p-3 text-sm">
      <span className="font-semibold">{reply.meta}</span>
      {reply.languageNote && (
        <span className="text-xs text-muted">{reply.languageNote}</span>
      )}
      <p className="[overflow-wrap:anywhere]" lang={reply.language}>
        {reply.text}
      </p>
    </div>
  )
}

/**
 * Phones: one card per review in the M03 ticket shape: the gift or tour first, then the
 * stars, the guest and the text, the shop's reply, and the reply action.
 */
function StackedRows({ rows, label, onReply }: ReviewRowsProps) {
  return (
    <ul aria-label={label} className="flex flex-col gap-5 lg:hidden">
      {rows.map(row => (
        <li key={row.id}>
          <article
            aria-label={row.guestName}
            className="flex flex-col overflow-hidden rounded-3xl bg-surface shadow-surface"
          >
            <div className="flex items-center gap-3 p-4">
              <Media
                alt=""
                className="size-12 shrink-0 rounded-lg"
                photo={row.item.photo}
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="leading-snug font-semibold">
                  {row.item.name}
                </span>
                <span className="text-xs text-muted">{row.item.kind}</span>
              </div>
            </div>
            <div className="flex flex-col gap-3 border-t border-dashed border-separator p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <img
                    alt=""
                    className="size-10 shrink-0 rounded-full bg-surface-secondary object-cover"
                    decoding="async"
                    loading="lazy"
                    src={row.avatar}
                  />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-semibold">
                      {row.guestName}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-muted tabular-nums">
                      <Stars label={row.ratingLabel} rating={row.rating} />
                      {row.date}
                    </span>
                  </div>
                </div>
              </div>
              {row.languageNote && (
                <span className="text-xs text-muted">{row.languageNote}</span>
              )}
              <p
                className="text-body [overflow-wrap:anywhere]"
                lang={row.textLanguage}
              >
                {row.text}
              </p>
              {row.reply && <Reply reply={row.reply} />}
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-separator px-4 py-2.5 [&_svg]:shrink-0">
              <ReplyButton row={row} onReply={onReply} />
              <ReplyState row={row} />
            </div>
          </article>
        </li>
      ))}
    </ul>
  )
}

/** From 1024px: a Table, as M03. */
export function ReviewRows(props: ReviewRowsProps) {
  const { t } = useLocale()
  const { onReply } = props
  const columns: DataTableColumn<ReviewRowProps>[] = [
    {
      id: 'review',
      header: t('merchantReviews.column.review'),
      skeleton: 'two-line',
      isRowHeader: true,
      cellClassName: 'py-3',
      render: row => (
        <div className="flex max-w-md flex-col gap-1.5">
          <span className="font-semibold">{row.guestName}</span>
          <span className="flex items-center gap-1.5 text-xs text-muted tabular-nums">
            <Stars label={row.ratingLabel} rating={row.rating} />
            {row.date}
          </span>
          {row.languageNote && (
            <span className="text-xs text-muted">{row.languageNote}</span>
          )}
          <p
            className="line-clamp-3 text-sm [overflow-wrap:anywhere]"
            lang={row.textLanguage}
          >
            {row.text}
          </p>
        </div>
      ),
    },
    {
      id: 'item',
      header: t('merchantReviews.column.item'),
      skeleton: 'lead',
      render: row => (
        <div className="flex items-center gap-3">
          <Media
            alt=""
            className="size-10 shrink-0 rounded-lg"
            photo={row.item.photo}
          />
          <div className="flex min-w-0 flex-col">
            <span>{row.item.name}</span>
            <span className="text-label text-muted">{row.item.kind}</span>
          </div>
        </div>
      ),
    },
    {
      id: 'reply',
      header: t('merchantReviews.column.reply'),
      skeleton: 'two-line',
      cellClassName: 'py-3',
      render: row => (
        <div className="flex max-w-xs flex-col items-start gap-2 [&_svg]:shrink-0">
          <ReplyState row={row} />
          {row.reply && (
            <p
              className="line-clamp-2 text-xs text-muted"
              lang={row.reply.language}
            >
              {row.reply.text}
            </p>
          )}
        </div>
      ),
    },
  ]

  return (
    <DataTable
      cards={page => <StackedRows {...props} rows={page} />}
      columns={columns}
      empty={props.empty}
      getRowId={row => row.id}
      isLoading={props.isLoading}
      label={props.label}
      resetKey={props.resetKey}
      rowActions={{
        render: row => (
          <RowActions
            actions={[
              {
                id: 'reply',
                label: t(
                  row.reply
                    ? 'merchantReviews.action.edit'
                    : 'merchantReviews.action.reply',
                ),
                icon: row.reply ? ProfileEditIcon : MessageIcon,
              },
            ]}
            label={t('table.rowActions', { name: row.guestName })}
            onAction={() => onReply(row)}
          />
        ),
      }}
      rows={props.rows}
    />
  )
}
