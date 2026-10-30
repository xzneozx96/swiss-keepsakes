import type { MediaItem } from '@sk/api-contract'

import { Skeleton } from '@heroui/react'

import { SelectedIcon } from '@/components/icons'
import { StatusChip } from '@/components/status-chip'
import { useLocale } from '@/contexts/locale-context'
import { FileThumb } from './file-thumb'

const GRID = 'grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6'

function Tile({ item, busy, selecting, selected, onPress }: { item: MediaItem, busy: boolean, selecting: boolean, selected: boolean, onPress: () => void }) {
  const { t } = useLocale()
  const unused = item.status === 'ready' && !item.usage?.pages

  return (
    <button
      aria-label={selecting ? t('media.select.toggle', { name: item.name }) : item.name}
      aria-pressed={selecting ? selected : undefined}
      className="flex w-full flex-col gap-1 rounded-xl text-start outline-none focus-visible:focus-ring"
      data-media={item.id}
      type="button"
      onClick={onPress}
    >
      <span className={`relative block w-full overflow-hidden rounded-xl ${selected ? 'ring-2 ring-foreground ring-offset-2' : ''}`}>
        <FileThumb busy={busy} className="aspect-square w-full rounded-xl" item={item} />
        {unused && <span className="absolute start-1.5 bottom-1.5 rounded-full bg-surface/90 px-2 py-0.5 text-[11px] font-semibold">{t('media.grid.unused')}</span>}
        {item.status !== 'ready' && (
          <span className="absolute start-1.5 bottom-1.5">
            <StatusChip tone={item.status === 'processing' ? 'info' : 'neutral'}>{t(`media.status.${item.status}`)}</StatusChip>
          </span>
        )}
        {selecting && (
          <span aria-hidden className={`absolute end-1.5 top-1.5 flex size-6 items-center justify-center rounded-full border-2 ${selected ? 'border-surface bg-surface text-foreground' : 'border-surface/90 bg-foreground/20'}`}>
            {selected && <SelectedIcon size={22} weight="Filled" />}
          </span>
        )}
      </span>
      <span aria-hidden className="truncate px-0.5 text-xs text-muted">{item.name}</span>
    </button>
  )
}

/** The photo wall: square tiles, three across on a phone, four from 640 px, six from 1024 px. */
export function PhotoWall({ items, label, busyIds, selecting, selected, onOpen, onToggle }: {
  items: MediaItem[]
  label: string
  busyIds: string[]
  selecting: boolean
  selected: string[]
  onOpen: (item: MediaItem) => void
  onToggle: (item: MediaItem) => void
}) {
  return (
    <ul aria-label={label} className={GRID}>
      {items.map(item => (
        <li key={item.id}>
          <Tile busy={busyIds.includes(item.id)} item={item} selected={selected.includes(item.id)} selecting={selecting} onPress={() => (selecting ? onToggle(item) : onOpen(item))} />
        </li>
      ))}
    </ul>
  )
}

/** Twelve square tiles in the wall's own grid, so nothing jumps when the photos arrive. */
export function WallSkeleton() {
  return (
    <ul aria-hidden className={GRID}>
      {Array.from({ length: 12 }, (_, i) => (
        <li key={i}>
          <Skeleton className="aspect-square w-full rounded-xl" />
        </li>
      ))}
    </ul>
  )
}
