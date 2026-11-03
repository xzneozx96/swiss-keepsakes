import type { MediaItem } from '@sk/api-contract'
import type { PendingPhoto } from '../hooks/use-pending-photos'

import { Button, SearchField, Skeleton, Spinner, toast } from '@heroui/react'
import { useEffect, useRef, useState } from 'react'

import { EmptyState } from '@/components/empty-state'
import { LibraryIcon, SearchIcon, UploadIcon } from '@/components/icons'
import { Pager } from '@/components/list-pagination'
import { SheetFrame } from '@/components/sheet-frame'
import { useLocale } from '@/contexts/locale-context'
import { useLatest } from '@/hooks/use-latest'
import { useListLoading } from '@/hooks/use-list-loading'
import { useMediaList, useMediaNames, useReadyIds } from '../api/queries'
import { useDuplicateCheck } from '../hooks/use-duplicate-check'
import { usePendingPhotos } from '../hooks/use-pending-photos'
import { refusalOf } from '../hooks/use-photo-upload'
import { WALL_PAGE_SIZE } from '../lib/search-params'
import { FileThumb } from './file-thumb'
import { ACCEPT } from './photo-parts'
import { TileMark, TileOutline } from './tile-mark'
import { TILE_GAPS } from './tile-style'

const SEARCH_DELAY_MS = 250
const GRID = `grid grid-cols-3 ${TILE_GAPS} sm:grid-cols-4`

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

/** A chip at the tile's bottom-left. */
function TileChip({ children }: { children: string }) {
  return <span aria-hidden className="absolute start-1.5 bottom-1.5 rounded-full bg-surface/90 px-2 py-0.5 text-[11px] font-semibold">{children}</span>
}

/**
 * One photo as a labelled checkbox: the file name is its name for a screen reader; the tile shows the picture.
 * Choosable: an empty corner circle; chosen in this pick: the inside outline and the filled circle. A photo the page already has is disabled and faded, with no accent; so is a photo that is still processing when `blocked`.
 */
function Choice({ item, checked, disabled, used, blocked, onToggle }: { item: MediaItem, checked: boolean, disabled: boolean, used: boolean, blocked: boolean, onToggle: () => void }) {
  const { t } = useLocale()
  const processing = !used && item.status === 'processing'
  // The picture's spinner has a name of its own, so the checkbox says what it is.
  const name = used ? `${item.name}, ${t('media.library.used')}` : processing ? `${item.name}, ${t('media.status.processing')}` : item.name

  return (
    <li>
      <label className={`group flex flex-col gap-1 ${disabled || blocked ? 'cursor-default opacity-60' : 'cursor-pointer'}`}>
        <input
          aria-label={name}
          checked={checked}
          className="peer sr-only"
          disabled={disabled || blocked}
          type="checkbox"
          onChange={onToggle}
        />
        <span className="relative block w-full rounded-xl peer-focus-visible:focus-ring">
          <span className="relative block w-full overflow-hidden rounded-xl">
            <FileThumb className="aspect-square w-full" item={item} />
            <TileOutline shown={checked} />
            {!disabled && !blocked && <TileMark selected={checked} />}
            {used && <TileChip>{t('media.library.used')}</TileChip>}
            {processing && <TileChip>{t('media.status.processing')}</TileChip>}
          </span>
        </span>
        <span aria-hidden className="truncate px-0.5 text-xs text-muted">{item.name}</span>
      </label>
    </li>
  )
}

/** A file on its way up (or failed) in the picker's grid: its own picture, the state on it, Retry and Remove when it failed. */
function PendingChoice({ item, onRetry, onRemove }: { item: PendingPhoto, onRetry: () => void, onRemove: () => void }) {
  const { t } = useLocale()
  const failed = item.status === 'failed'

  return (
    <li className="flex flex-col gap-1">
      <span className="relative block w-full">
        <span className="relative block w-full overflow-hidden rounded-xl">
          <span className="relative block aspect-square w-full bg-default">
            <img alt="" className="absolute inset-0 size-full object-cover" src={item.previewUrl} />
            {!failed && (
              <span className="absolute inset-0 flex items-center justify-center bg-surface/60">
                <Spinner size="sm" />
              </span>
            )}
          </span>
          <TileChip>{t(failed ? 'media.photo.failed' : 'media.photo.uploading')}</TileChip>
        </span>
      </span>
      <span aria-live="polite" className={`truncate px-0.5 text-xs ${failed ? 'text-danger' : 'text-muted'}`} role="status">
        {failed && item.message && item.message !== 'media.photo.failed' ? t(item.message) : item.name}
      </span>
      {failed && (
        <span className="flex gap-1">
          <Button aria-label={t('media.photo.retryName', { name: item.name })} size="sm" variant="tertiary" onPress={onRetry}>{t('media.photo.retry')}</Button>
          <Button aria-label={t('media.photos.remove', { name: item.name })} size="sm" variant="tertiary" onPress={onRemove}>{t('media.library.remove')}</Button>
        </span>
      )}
    </li>
  )
}

function PickerBody({ storeId, used, selected, room, single, readyOnly, uploads, onToggle, onUpload }: {
  storeId: string
  used: string[]
  selected: string[]
  room: number
  /** One photo is chosen: an upload or a pick replaces the choice, and there is always room for it. */
  single: boolean
  /** A photo that is still processing cannot be chosen (a cover must be ready). */
  readyOnly: boolean
  uploads: { pending: PendingPhoto[], retry: (key: string) => void, remove: (key: string) => void }
  onToggle: (id: string) => void
  onUpload: (files: File[]) => void
}) {
  const { t } = useLocale()
  const inputRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  const [q, setQ] = useState<string | undefined>()
  const [page, setPage] = useState(1)
  // A photo still being made shows too, so one uploaded here is in the grid at once.
  const list = useMediaList(storeId, { kind: 'image', q, status: 'processing,ready', page, pageSize: WALL_PAGE_SIZE })
  const items = list.data?.items ?? []
  const isLoading = useListLoading(list)
  const total = list.data?.total ?? 0
  const free = single ? 1 : room - selected.length - uploads.pending.length

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
      <div className="flex items-center gap-2">
        <SearchField aria-label={t('media.search')} className="w-full" value={text} onChange={setText}>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input className="w-full" placeholder={t('media.search')} />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        <Button className="shrink-0 max-lg:min-h-11" isDisabled={free <= 0} size="sm" variant="secondary" onPress={() => inputRef.current?.click()}>
          <UploadIcon aria-hidden size={16} />
          {t('media.library.upload')}
        </Button>
        <input
          ref={inputRef}
          multiple={free > 1}
          accept={ACCEPT}
          aria-label={t('media.library.upload')}
          className="sr-only"
          data-testid="picker-input"
          tabIndex={-1}
          type="file"
          onChange={(event) => {
            const files = [...(event.target.files ?? [])]

            event.target.value = ''
            if (files.length > 0)
              onUpload(files.slice(0, free))
          }}
        />
      </div>
      {list.isError && !list.data && <EmptyState compact icon={SearchIcon} message={t('media.loadFailed')} />}
      {isLoading && <PickerSkeleton />}
      {!isLoading && list.data && !items.length && !uploads.pending.length && <EmptyState compact icon={q ? SearchIcon : LibraryIcon} message={t(q ? 'media.empty.filtered' : 'media.library.empty')} />}
      {((!isLoading && items.length > 0) || uploads.pending.length > 0) && (
        <ul aria-label={t('media.library.list')} className={GRID}>
          {uploads.pending.map(item => <PendingChoice key={item.key} item={item} onRemove={() => uploads.remove(item.key)} onRetry={() => uploads.retry(item.key)} />)}
          {!isLoading && items.map((item) => {
            const isUsed = used.includes(item.id)
            const checked = !isUsed && selected.includes(item.id)

            return <Choice key={item.id} blocked={readyOnly && item.status === 'processing'} checked={checked} disabled={isUsed || (!checked && free <= 0)} item={item} used={isUsed} onToggle={() => onToggle(item.id)} />
          })}
        </ul>
      )}
      {!isLoading && <Pager compact pager={{ page, pages: Math.max(1, Math.ceil(total / WALL_PAGE_SIZE)), total, from: (page - 1) * WALL_PAGE_SIZE + 1, to: Math.min(page * WALL_PAGE_SIZE, total), go: setPage }} />}
    </div>
  )
}

/**
 * The photo wall of the library with its uploads, to sit inside a sheet of its own: the same list, search and paging as the Media screen
 * (images, ready or still processing), "Upload a photo" (duplicate check, request, PUT, confirm) and the duplicates dialog. The parent owns
 * `selected` and the sheet around it. A new upload and a library duplicate the merchant chose to reuse are chosen at once, except with
 * `waitForReady`: a new upload is chosen only when its file is ready (a story's photo block must not name a file that is still being made),
 * and a line says which file is awaited. `onLateUpload` gets an id that lands after the wall was closed. A file that is not a photo shows
 * a toast, as on the Media screen, and its row says why.
 */
export function LibraryChoice({ storeId, used, room, single = false, readyOnly = false, waitForReady = false, selected, onSelectedChange, onLateUpload }: {
  storeId: string
  used: string[]
  room: number
  single?: boolean
  readyOnly?: boolean
  waitForReady?: boolean
  selected: string[]
  onSelectedChange: (ids: string[]) => void
  onLateUpload?: (id: string) => void
}) {
  const { t } = useLocale()
  const duplicates = useDuplicateCheck(storeId)
  const [awaiting, setAwaiting] = useState<string[]>([])
  const mountedRef = useRef(true)
  const claimedRef = useRef(new Set<string>())
  const latest = useLatest({ used, selected, onSelectedChange, onLateUpload })
  const choose = (ids: string[]) => latest.current.onSelectedChange(single ? ids.slice(-1) : [...new Set([...latest.current.selected, ...ids])])
  const uploads = usePendingPhotos(storeId, (id) => {
    if (!mountedRef.current)
      latest.current.onLateUpload?.(id)
    else if (waitForReady)
      setAwaiting(current => [...current, id])
    else
      choose([id])
  })
  const ready = useReadyIds(storeId, awaiting)
  const waiting = awaiting.filter(id => !ready.includes(id))
  const names = useMediaNames(storeId, waiting)

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
    }
  }, [])
  // A file that was awaited and is now ready is chosen once; deselecting it later does not bring it back.
  useEffect(() => {
    const fresh = ready.filter(id => !claimedRef.current.has(id))

    if (fresh.length === 0)
      return
    for (const id of fresh)
      claimedRef.current.add(id)
    choose(fresh)
  })

  const upload = async (files: File[]) => {
    const refused = files.filter(file => refusalOf(file))

    if (refused.length > 0)
      toast.warning(t(refused.length === 1 ? 'media.upload.refusedOne' : 'media.upload.refused', { count: refused.length, list: refused.map(file => file.name).join(', ') }))
    const decision = await duplicates.resolve(files, file => !refusalOf(file))

    if (!decision)
      return
    const reused = decision.reuse.map(({ id }) => id).filter(id => !latest.current.used.includes(id))

    if (reused.length > 0)
      latest.current.onSelectedChange(single ? reused.slice(0, 1) : [...new Set([...latest.current.selected, ...reused])])
    uploads.add(decision.upload)
  }
  const toggle = (id: string) => onSelectedChange(selected.includes(id) ? selected.filter(other => other !== id) : single ? [id] : [...selected, id])

  return (
    <>
      <PickerBody readyOnly={readyOnly} room={room} selected={selected} single={single} storeId={storeId} uploads={uploads} used={used} onToggle={toggle} onUpload={files => void upload(files)} />
      {waiting.map((id, index) => (
        <p key={id} aria-live="polite" className="text-sm text-muted" role="status">{t('storyMedia.photo.waiting', { name: names[index] ?? '' })}</p>
      ))}
      {duplicates.dialog}
    </>
  )
}

/**
 * Choose photos that are already in the store's library, up to `room` of them, in a sheet of their own (the wall is `LibraryChoice`).
 * A photo the page already has is disabled, faded, and marked "already added". Add selected hands the ids to `onAdd` in the order
 * they were chosen. With `single` one photo is chosen (a new pick replaces it, `room` is ignored) and the button reads "Use this photo":
 * a variant takes one photo of the library. `title` and `chooseLabel` replace the sheet title and the button text (a story's cover
 * says "Cover photo" and "Use as cover"); `readyOnly` disables a photo that is still processing.
 */
export function LibraryPicker({ storeId, isOpen, used, room, single = false, title, chooseLabel, readyOnly = false, onAdd, onClose }: {
  storeId: string
  isOpen: boolean
  /** The photos the page already has. */
  used: string[]
  /** How many more photos the page takes. */
  room: number
  /** Choose one photo instead of several. */
  single?: boolean
  title?: string
  chooseLabel?: string
  readyOnly?: boolean
  onAdd: (ids: string[]) => void
  onClose: () => void
}) {
  const { t } = useLocale()
  const [selected, setSelected] = useState<string[]>([])
  const close = () => {
    setSelected([])
    onClose()
  }

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
            {chooseLabel ?? t(single ? 'media.library.choose' : 'media.library.add')}
          </Button>
          <Button variant="tertiary" onPress={close}>{t('media.library.cancel')}</Button>
        </>
      )}
      isOpen={isOpen}
      title={title ?? t(single ? 'media.library.titleOne' : 'media.library.title')}
      onClose={close}
    >
      {!single && <p aria-live="polite" className="text-sm text-muted" role="status">{t('media.library.selected', { count: selected.length, room })}</p>}
      <LibraryChoice readyOnly={readyOnly} room={room} selected={selected} single={single} storeId={storeId} used={used} onLateUpload={id => onAdd([id])} onSelectedChange={setSelected} />
    </SheetFrame>
  )
}
