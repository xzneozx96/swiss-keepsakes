import type { ArticleRowProps } from '../hooks/use-merchant-articles'
import type { DataTableColumn } from '@/components/data-table'
import type { EmptyStateProps } from '@/components/empty-state'

import { DataTable } from '@/components/data-table'
import { ChevronRightIcon, EditIcon } from '@/components/icons'
import { Media } from '@/components/media'
import { RowActions } from '@/components/row-actions'
import { StatusChip } from '@/components/status-chip'
import { useLocale } from '@/contexts/locale-context'

interface ArticleRowsProps {
  rows: ArticleRowProps[]
  /** Accessible name of the list or table, e.g. the selected filter. */
  label: string
  /** Shown inside the table (a card on phones) when `rows` is empty. */
  empty?: EmptyStateProps
  /** Back to page 1 when this changes. */
  resetKey?: string
  isLoading?: boolean
}

function Flags({ row }: { row: ArticleRowProps }) {
  return (
    <>
      <StatusChip tone={row.status.tone}>{row.status.text}</StatusChip>
      {row.unpublishedLinks && (
        <StatusChip tone="warning">{row.unpublishedLinks}</StatusChip>
      )}
      {row.missingVersion && (
        <StatusChip tone="neutral">{row.missingVersion}</StatusChip>
      )}
    </>
  )
}

/**
 * Phones: one card per language version in the M03 ticket shape. The cover sits where M03
 * has the date tile; the chips say what guests see; the dashed footer holds the facts. The
 * whole card opens the editor.
 */
function StackedRows({ rows, label }: ArticleRowsProps) {
  const { t } = useLocale()

  return (
    <ul aria-label={label} className="flex flex-col gap-5 lg:hidden">
      {rows.map(row => (
        <li key={row.id}>
          <a
            className="flex flex-col overflow-hidden rounded-3xl bg-surface shadow-surface outline-none card-hover focus-visible:focus-ring"
            href={row.href}
          >
            <div className="flex items-center gap-4 p-4">
              <Media
                alt=""
                className="size-16 shrink-0 rounded-xl"
                photo={row.photo}
              />
              <div className="min-w-0 flex-1">
                <h3
                  className="text-lg leading-tight font-semibold text-pretty [overflow-wrap:anywhere]"
                  lang={row.language}
                >
                  {row.title}
                </h3>
                <p className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                  <span className="font-semibold text-foreground">
                    {row.languageCode}
                  </span>
                  <span aria-hidden className="text-border">
                    ·
                  </span>
                  <span>{row.author}</span>
                  <span aria-hidden className="text-border">
                    ·
                  </span>
                  <span className="whitespace-nowrap">{row.readTime}</span>
                </p>
              </div>
              <ChevronRightIcon
                aria-hidden
                className="shrink-0 text-muted"
                size={18}
              />
            </div>
            <div className="flex flex-wrap gap-1.5 px-4 pb-4 [&_.chip]:max-w-full [&_.chip__label]:whitespace-normal [&_svg]:shrink-0">
              <Flags row={row} />
            </div>
            <dl className="flex flex-col gap-2 border-t border-dashed border-separator px-4 py-3.5 text-sm">
              {[
                {
                  label: t('merchantArticles.column.updated'),
                  value: row.changed,
                },
                { label: t('merchantArticles.links'), value: row.links },
                {
                  label: t('merchantArticles.comments'),
                  value: String(row.comments),
                },
              ].map(fact => (
                <div
                  key={fact.label}
                  className="flex items-baseline justify-between gap-4"
                >
                  <dt className="shrink-0 text-muted">{fact.label}</dt>
                  <dd className="text-end text-muted tabular-nums">
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
          </a>
        </li>
      ))}
    </ul>
  )
}

/** From 1024px: a Table, as M03. */
export function ArticleRows(props: ArticleRowsProps) {
  const { t } = useLocale()
  const columns: DataTableColumn<ArticleRowProps>[] = [
    {
      id: 'article',
      header: t('merchantArticles.column.article'),
      skeleton: 'lead',
      isRowHeader: true,
      render: row => (
        <div className="flex items-center gap-3">
          <Media
            alt=""
            className="size-12 shrink-0 rounded-lg"
            photo={row.photo}
          />
          <div className="flex min-w-0 flex-col">
            <span className="font-semibold" lang={row.language}>
              {row.title}
            </span>
            <span className="text-label text-muted">
              {row.languageCode} · {row.author} · {row.readTime}
            </span>
          </div>
        </div>
      ),
    },
    {
      id: 'status',
      header: t('merchantArticles.column.status'),
      skeleton: 'chip',
      cellClassName: 'py-2',
      render: row => (
        <div className="flex flex-col items-start gap-1.5 [&_svg]:shrink-0">
          <Flags row={row} />
        </div>
      ),
    },
    {
      id: 'links',
      header: t('merchantArticles.column.links'),
      skeleton: 'line',
      cellClassName: 'whitespace-nowrap tabular-nums',
      render: row => row.links,
    },
    {
      id: 'updated',
      header: t('merchantArticles.column.updated'),
      skeleton: 'line',
      cellClassName: 'whitespace-nowrap tabular-nums',
      render: row => row.changed,
    },
  ]

  return (
    <DataTable
      cards={page => <StackedRows {...props} rows={page} />}
      columns={columns}
      empty={props.empty}
      getRowHref={row => row.href}
      getRowId={row => row.id}
      isLoading={props.isLoading}
      label={props.label}
      resetKey={props.resetKey}
      rowActions={{
        render: row => (
          <RowActions
            actions={[
              {
                id: 'edit',
                label: t('rowAction.editArticle'),
                icon: EditIcon,
                href: row.href,
              },
            ]}
            label={t('table.rowActions', { name: row.title })}
          />
        ),
      }}
      rows={props.rows}
    />
  )
}
