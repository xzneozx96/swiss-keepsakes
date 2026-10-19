import type { AdviceRow } from '../hooks/use-merchant-requests'
import type { DataTableColumn } from '@/components/data-table'
import type { EmptyStateProps } from '@/components/empty-state'

import { DataTable } from '@/components/data-table'
import { ArrowUpRightIcon, ChevronRightIcon } from '@/components/icons'
import { RowActions } from '@/components/row-actions'
import { StatusChip } from '@/components/status-chip'
import { useLocale } from '@/contexts/locale-context'

interface AdviceRowsProps {
  rows: AdviceRow[]
  /** Accessible name of the list or table: the tab. */
  label: string
  /** Shown inside the table (a card on phones) when `rows` is empty. */
  empty?: EmptyStateProps
  /** Back to page 1 when this changes. */
  resetKey?: string
  isLoading?: boolean
}

/**
 * Phones: one card per request in the M03 card frame. The guest's email, New or Read with
 * the language and time, then the first answers under their questions as the guest saw them.
 * The whole card opens the request, which marks it read.
 */
function StackedRows({ rows, label }: AdviceRowsProps) {
  return (
    <ul aria-label={label} className="flex flex-col gap-5 lg:hidden">
      {rows.map(row => (
        <li key={row.id}>
          <a
            className="flex flex-col overflow-hidden rounded-3xl bg-surface shadow-surface outline-none card-hover focus-visible:focus-ring"
            href={row.href}
          >
            <div className="flex items-start gap-3 p-4">
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <h3 className="text-lg leading-tight font-semibold [overflow-wrap:anywhere]">
                  {row.email}
                </h3>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                  <StatusChip tone={row.status.tone}>
                    {row.status.text}
                  </StatusChip>
                  <span className="text-xs text-muted tabular-nums">
                    {row.meta}
                  </span>
                </div>
              </div>
              <ChevronRightIcon
                aria-hidden
                className="mt-1 shrink-0 text-muted"
                size={18}
              />
            </div>
            <dl className="flex flex-col gap-3 px-4 pb-4">
              {row.preview.map((item, i) => (
                <div key={i} className="flex flex-col gap-0.5">
                  <dt className="text-xs text-muted" lang={item.language}>
                    {item.question}
                  </dt>
                  <dd className="line-clamp-3 text-sm font-medium">
                    {item.answer}
                  </dd>
                </div>
              ))}
            </dl>
            {row.more && (
              <p className="border-t border-dashed border-separator px-4 py-3.5 text-sm text-muted">
                {row.more}
              </p>
            )}
          </a>
        </li>
      ))}
    </ul>
  )
}

/** From 1024px: a Table; each row opens the request. */
/** M19 inbox: phone cards, or the table from 1024px. */
export function AdviceRows(props: AdviceRowsProps) {
  const { t } = useLocale()
  const columns: DataTableColumn<AdviceRow>[] = [
    {
      id: 'guest',
      header: t('merchantRequests.column.guest'),
      skeleton: 'two-line',
      isRowHeader: true,
      cellClassName: 'whitespace-nowrap',
      render: row => (
        <div className="flex flex-col">
          <span className="font-semibold">{row.email}</span>
          <span className="text-label text-muted">{row.languageName}</span>
        </div>
      ),
    },
    {
      id: 'answers',
      header: t('merchantRequests.column.answers'),
      skeleton: 'two-line',
      render: row => (
        <div className="flex max-w-md flex-col">
          {row.preview.slice(0, 2).map((item, i) => (
            <span key={i} className="truncate">
              <span className="text-muted" lang={item.language}>
                {item.question}
              </span>
              {' '}
              {item.answer}
            </span>
          ))}
          <span className="text-label text-muted">{row.count}</span>
        </div>
      ),
    },
    {
      id: 'sent',
      header: t('merchantRequests.column.sent'),
      skeleton: 'line',
      cellClassName: 'whitespace-nowrap tabular-nums',
      render: row => row.sentAt,
    },
    {
      id: 'status',
      header: t('merchantRequests.column.status'),
      skeleton: 'chip',
      render: row => (
        <StatusChip tone={row.status.tone}>{row.status.text}</StatusChip>
      ),
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
                id: 'open',
                label: t('rowAction.openRequest'),
                icon: ArrowUpRightIcon,
                href: row.href,
              },
            ]}
            label={t('table.rowActions', { name: row.email })}
          />
        ),
      }}
      rows={props.rows}
    />
  )
}
