import type { MediaItem } from '@sk/api-contract'

import { Button, SearchField, Skeleton } from '@heroui/react'
import { useEffect, useState } from 'react'

import { EmptyState } from '@/components/empty-state'
import { LibraryIcon, SearchIcon } from '@/components/icons'
import { Pager } from '@/components/list-pagination'
import { SheetFrame } from '@/components/sheet-frame'
import { useLocale } from '@/contexts/locale-context'
import { useMediaList } from '../api/queries'
import { WALL_PAGE_SIZE } from '../lib/search-params'
import { FileThumb } from './file-thumb'
import { TileMark, TileOutline } from './tile-mark'

const SEARCH_DELAY_MS = 250
const GRID = 'grid grid-cols-3 gap-2 sm:grid-cols-4'

/** Twelve square tiles in the picker's own grid, so nothing jumps when the photos arrive. */
function PickerSkeleton() {
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

/** One photo as a labelled checkbox: the file name is its name for a screen reader; the tile shows the picture. */
function Choice({ item, checked, disabled, used, onToggle }: { item: MediaItem, checked: boolean, disabled: boolean, used: boolean, onToggle: () => void }) {
  const { t } = useLocale()

  return (
    <li>
      <label className={`group relative flex flex-col gap-1 ${disabled ? 'cursor-default' : 'cursor-pointer'}`}>
        <input
          checked={checked}
          className="peer sr-only"
          disabled={disabled}
          type="checkbox"
          onChange={onToggle}
        />
        <span className="sr-only">{used ? `${item.name}, ${t('media.library.used')}` : item.name}</span>
        <span className={`relative block w-full overflow-hidden rounded-xl peer-focus-visible:focus-ring ${used ? 'opacity-60' : ''}`}>
          <FileThumb className="aspect-square w-full rounded-xl" item={item} />
          <TileOutline shown={checked} />
          <TileMark selected={checked} />
          {used && <span aria-hidden className="absolute start-1.5 bottom-1.5 rounded-full bg-surface/90 px-2 py-0.5 text-[11px] font-semibold">{t('media.library.used')}</span>}
        </span>
        <span aria-hidden className="truncate px-0.5 text-xs text-muted">{item.name}</span>
      </label>
    </li>
  )
}

function PickerBody({ storeId, used, selected, room, onToggle }: { storeId: string, used: string[], selected: string[], room: number, onToggle: (id: string) => void }) {
  const { t } = useLocale()
  const [text, setText] = useState('')
  const [q, setQ] = useState<string | undefined>()
  const [page, setPage] = useState(1)
  const list = useMediaList(storeId, { kind: 'image', q, status: 'ready', page, pageSize: WALL_PAGE_SIZE })
  const items = list.data?.items ?? []
  const total = list.data?.total ?? 0

  // The list reads a moment after the last key, so each letter does not.
  useEffect(() => {
    if (text.trim() === (q ?? ''))
      return
    const timer = setTimeout(() => {
      setQ(text.trim() || undefined)
      setPage(1)
    }, SEARCH_DELAY_MS)

    return () => clearTimeout(timer)
  }, [text, q])

  return (
    <div className="flex flex-col gap-4">
      <SearchField aria-label={t('media.search')} className="w-full" value={text} onChange={setText}>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input className="w-full" placeholder={t('media.search')} />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>
      {list.isError && !list.data && <EmptyState compact icon={SearchIcon} message={t('media.loadFailed')} />}
      {list.isPending && <PickerSkeleton />}
      {list.data && !items.length && <EmptyState compact icon={q ? SearchIcon : LibraryIcon} message={t(q ? 'media.empty.filtered' : 'media.library.empty')} />}
      {items.length > 0 && (
        <ul aria-label={t('media.library.list')} className={GRID}>
          {items.map((item) => {
            const isUsed = used.includes(item.id)
            const checked = isUsed || selected.includes(item.id)

            return <Choice key={item.id} checked={checked} disabled={isUsed || (!checked && selected.length >= room)} item={item} used={isUsed} onToggle={() => onToggle(item.id)} />
          })}
        </ul>
      )}
      <Pager compact pager={{ page, pages: Math.max(1, Math.ceil(total / WALL_PAGE_SIZE)), total, from: (page - 1) * WALL_PAGE_SIZE + 1, to: Math.min(page * WALL_PAGE_SIZE, total), go: setPage }} />
    </div>
  )
}

/**
 * Choose photos that are already in the store's library (the same list, search and paging as the Media screen,
 * ready images only), up to `room` of them. A photo the page already has shows as chosen and cannot be changed.
 * Add selected hands the ids to `onAdd` in the order they were chosen.
 */
export function LibraryPicker({ storeId, isOpen, used, room, onAdd, onClose }: {
  storeId: string
  isOpen: boolean
  /** The photos the page already has. */
  used: string[]
  /** How many more photos the page takes. */
  room: number
  onAdd: (ids: string[]) => void
  onClose: () => void
}) {
  const { t } = useLocale()
  const [selected, setSelected] = useState<string[]>([])
  const close = () => {
    setSelected([])
    onClose()
  }
  const toggle = (id: string) => setSelected(current => (current.includes(id) ? current.filter(other => other !== id) : [...current, id]))

  return (
    <SheetFrame
      footer={(
        <>
          <Button
            isDisabled={selected.length === 0}
            onPress={() => {
              onAdd(selected)
              close()
            }}
          >
            {t('media.library.add')}
          </Button>
          <Button variant="tertiary" onPress={close}>{t('media.library.cancel')}</Button>
        </>
      )}
      isOpen={isOpen}
      title={t('media.library.title')}
      onClose={close}
    >
      <p aria-live="polite" className="text-sm text-muted" role="status">{t('media.library.selected', { count: selected.length, room })}</p>
      <PickerBody room={room} selected={selected} storeId={storeId} used={used} onToggle={toggle} />
    </SheetFrame>
  )
}
