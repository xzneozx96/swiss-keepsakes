import type { MediaItem } from '@sk/api-contract'
import type { RowAction } from '@/components/row-actions'

import { Skeleton } from '@heroui/react'

import { EditIcon, ResetIcon, TrashIcon } from '@/components/icons'
import { RowActions } from '@/components/row-actions'
import { StatusChip } from '@/components/status-chip'
import { useLocale } from '@/contexts/locale-context'
import { canReplace, retireCheck, usageLine } from '../lib/rules'
import { FileThumb } from './file-thumb'

const CARD = 'flex flex-col divide-y divide-separator rounded-3xl bg-surface px-4 py-1 shadow-surface'

function UsageText({ item }: { item: MediaItem }) {
  const { t } = useLocale()
  const usage = item.usage

  return <span className={usage?.pages ? (usage.published ? '' : 'text-warning') : 'text-muted'}>{usageLine(t, usage)}</span>
}

/** The ⋯ menu of a file: details, Replace, and Retire with its reason in the label when it is refused. */
function FileMenu({ item, onOpen, onReplace, onRetire }: { item: MediaItem, onOpen: () => void, onReplace: () => void, onRetire: () => void }) {
  const { t } = useLocale()
  const check = retireCheck(item)
  const label = !check.ok && check.reason === 'in-use'
    ? (check.pages === 1 ? t('media.row.retireUsedOne') : t('media.row.retireUsed', { count: check.pages }))
    : t('media.row.retire')
  const actions: RowAction<'open' | 'replace' | 'retire'>[] = [
    { id: 'open', label: t('media.row.open'), icon: EditIcon },
    { id: 'replace', label: t('media.row.replace'), icon: ResetIcon, isDisabled: !canReplace(item) },
    { id: 'retire', label, icon: TrashIcon, isDisabled: !check.ok },
  ]

  return (
    <RowActions
      actions={actions}
      label={t('media.row.actions', { name: item.name })}
      onAction={id => (id === 'open' ? onOpen() : id === 'replace' ? onReplace() : onRetire())}
    />
  )
}

/** The Audio and PDF lists: one row per file, the whole row opens the sheet. */
export function FileList({ items, label, busyIds, onOpen, onReplace, onRetire }: {
  items: MediaItem[]
  label: string
  busyIds: string[]
  onOpen: (item: MediaItem) => void
  onReplace: (item: MediaItem) => void
  onRetire: (item: MediaItem) => void
}) {
  const { t } = useLocale()

  return (
    <ul aria-label={label} className={CARD}>
      {items.map(item => (
        <li key={item.id} className="flex items-center gap-2 py-2 pe-1" data-media={item.id}>
          <button className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-start outline-none focus-visible:focus-ring" type="button" onClick={() => onOpen(item)}>
            <FileThumb busy={busyIds.includes(item.id)} item={item} />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold">{item.name}</span>
              <span className="truncate text-xs text-muted">{item.alt.en || t('media.alt.missing')}</span>
              <span className="text-xs">
                <UsageText item={item} />
              </span>
            </span>
          </button>
          {item.status !== 'ready' && <StatusChip tone={item.status === 'processing' ? 'info' : 'neutral'}>{t(`media.status.${item.status}`)}</StatusChip>}
          <FileMenu item={item} onOpen={() => onOpen(item)} onReplace={() => onReplace(item)} onRetire={() => onRetire(item)} />
        </li>
      ))}
    </ul>
  )
}

/** Three rows with a thumbnail, two lines and the menu, as a real row is shaped. */
export function ListSkeleton() {
  return (
    <ul aria-hidden className={CARD}>
      {[0, 1, 2].map(i => (
        <li key={i} className="flex items-center gap-3 py-2">
          <Skeleton className="size-12 shrink-0 rounded-lg" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/2 rounded-lg" />
            <Skeleton className="h-3 w-1/3 rounded-lg" />
          </div>
          <Skeleton className="size-8 shrink-0 rounded-full" />
        </li>
      ))}
    </ul>
  )
}
