import type { MediaItem } from '@sk/api-contract'
import type { MediaSearch, StatusFilter, UseFilter } from '../lib/search-params'
import type { PagerState } from '@/components/list-pagination'

import { Button, Skeleton } from '@heroui/react'
import { useEffect, useState } from 'react'

import { EmptyState } from '@/components/empty-state'
import { FilterChips, filterGroup } from '@/components/filter-bar'
import { PhotoAddIcon, SearchIcon, UploadIcon } from '@/components/icons'
import { MerchantPageHeader } from '@/components/layout/merchant-page-header'
import { Pager } from '@/components/list-pagination'
import { useLocale } from '@/contexts/locale-context'
import { useIsWide } from '@/hooks/use-is-wide'
import { useMediaList } from '../api/queries'
import { useMediaActions } from '../hooks/use-media-actions'
import { ACCEPT, retireCheck } from '../lib/rules'
import { pageSizeOf, STATUS_FILTERS, USE_FILTERS } from '../lib/search-params'
import { FileList, ListSkeleton } from './file-list'
import { MediaGate } from './media-gate'
import { MediaSheet } from './media-sheet'
import { MediaToolbar } from './media-toolbar'
import { PhotoWall, WallSkeleton } from './photo-wall'

const SEARCH_DELAY_MS = 250

// The file dialog also offers HEIC, so a refusal can say why (the type check names it).
const ACCEPT_UPLOAD = `${ACCEPT},.heic`

function UploadButton({ isBusy, onFiles }: { isBusy: boolean, onFiles: (files: File[]) => void }) {
  const { t } = useLocale()
  const [input, setInput] = useState<HTMLInputElement | null>(null)

  return (
    <>
      <Button className="shrink-0 max-lg:h-11 max-lg:w-full" isPending={isBusy} onPress={() => input?.click()}>
        <UploadIcon aria-hidden size={16} />
        {t('media.upload')}
      </Button>
      <input
        ref={setInput}
        hidden
        multiple
        accept={ACCEPT_UPLOAD}
        data-testid="upload-input"
        type="file"
        onChange={(event) => {
          const files = [...(event.target.files ?? [])]

          event.target.value = ''
          onFiles(files)
        }}
      />
    </>
  )
}

function Header({ upload }: { upload: React.ReactNode }) {
  const { t } = useLocale()

  return <MerchantPageHeader action={upload} className="max-lg:flex-col max-lg:items-stretch" description={t('media.intro')} title={t('media.title')} />
}

/** The toolbar's shape while the store is unknown: tabs, search and the first tiles. */
function LoadingScreen() {
  const { t } = useLocale()

  return (
    <div aria-busy aria-label={t('media.loading')} className="flex flex-col gap-4" role="status">
      <Header upload={<Skeleton className="h-9 w-28 rounded-full max-lg:h-11 max-lg:w-full" />} />
      <Skeleton className="h-10 w-full rounded-xl lg:w-72" />
      <WallSkeleton />
    </div>
  )
}

function Library({ storeId, search, onSearch }: { storeId: string, search: MediaSearch, onSearch: (patch: Partial<MediaSearch>) => void }) {
  const { t } = useLocale()
  const isWide = useIsWide()
  const kind = search.kind ?? 'image'
  const use = search.use ?? []
  const status = search.status ?? []
  const page = search.page ?? 1
  const pageSize = pageSizeOf(kind)
  const [text, setText] = useState(search.q ?? '')
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [open, setOpen] = useState<MediaItem | null>(null)
  const [refusedId, setRefusedId] = useState<string | null>(null)
  const actions = useMediaActions(storeId)
  const list = useMediaList(storeId, { kind, q: search.q, use: use.join(',') || undefined, status: status.join(',') || undefined, page, pageSize })
  const items = list.data?.items ?? []

  // The URL follows the search box a moment after the last key, so each letter does not read the list.
  useEffect(() => {
    if (text === (search.q ?? ''))
      return
    const timer = setTimeout(() => onSearch({ q: text.trim() ? text : undefined, page: undefined }), SEARCH_DELAY_MS)

    return () => clearTimeout(timer)
  }, [text, search.q, onSearch])

  const stopSelecting = () => {
    setSelecting(false)
    setSelected([])
  }
  const changeKind = (next: typeof kind) => {
    stopSelecting()
    onSearch({ kind: next === 'image' ? undefined : next, page: undefined, use: undefined, status: undefined })
  }
  const groups = [
    filterGroup<UseFilter>({
      id: 'use',
      label: t('media.filter.use'),
      options: USE_FILTERS.map(id => ({ id, label: t(`media.use.${id}`), count: list.data?.uses[id] })),
      selected: use,
      onChange: next => onSearch({ use: next.length ? next : undefined, page: undefined }),
    }),
    filterGroup<StatusFilter>({
      id: 'status',
      label: t('media.filter.status'),
      options: STATUS_FILTERS.map(id => ({ id, label: t(`media.status.${id}`), count: list.data?.statuses[id] })),
      selected: status,
      onChange: next => onSearch({ status: next.length ? next : undefined, page: undefined }),
    }),
  ]
  const total = list.data?.total ?? 0
  const pager: PagerState = {
    page,
    pages: Math.max(1, Math.ceil(total / pageSize)),
    total,
    from: (page - 1) * pageSize + 1,
    to: Math.min(page * pageSize, total),
    go: next => onSearch({ page: next > 1 ? next : undefined }),
  }
  const chosen = items.filter(item => selected.includes(item.id))
  const retirable = chosen.filter(item => retireCheck(item).ok)
  const kept = chosen.length - retirable.length
  const toggle = (item: MediaItem) => setSelected(current => (current.includes(item.id) ? current.filter(id => id !== item.id) : [...current, item.id]))
  // The sheet shows the live row, so a rename, a replacement or a retire shows at once.
  const shown = open ? items.find(item => item.id === open.id) ?? open : null
  const noFilter = !search.q && !use.length && !status.length
  const kindLabel = t(`media.kind.${kind}`)

  const retireOne = async (item: MediaItem) => {
    const outcome = await actions.retire(item)

    if (outcome === 'retired')
      setOpen(null)
    if (outcome === 'refused') {
      setRefusedId(item.id)
      setOpen(item)
    }
  }
  const retireChosen = async () => {
    if (await actions.retireMany(retirable, kept))
      stopSelecting()
  }

  return (
    <div className="flex flex-col gap-4" data-testid="media-library">
      <Header upload={<UploadButton isBusy={actions.isUploading} onFiles={files => void actions.upload(files)} />} />
      <MediaToolbar
        counts={list.data?.kinds ?? { image: undefined, audio: undefined, pdf: undefined }}
        groups={groups}
        kind={kind}
        selecting={selecting}
        text={text}
        onKind={changeKind}
        onSelecting={() => (selecting ? stopSelecting() : setSelecting(true))}
        onText={setText}
      />
      <FilterChips groups={groups} />

      {list.isError && !list.data && <EmptyState icon={SearchIcon} message={t('media.loadFailed')} />}
      {list.isPending && (kind === 'image' ? <WallSkeleton /> : <ListSkeleton />)}
      {list.data && !items.length && <EmptyState icon={noFilter ? PhotoAddIcon : SearchIcon} message={t(noFilter && !Object.values(list.data.kinds).some(Boolean) ? 'media.empty.all' : 'media.empty.filtered')} />}
      {items.length > 0 && (kind === 'image'
        ? <PhotoWall busyIds={actions.busyIds} items={items} label={kindLabel} selected={selected} selecting={selecting} onOpen={setOpen} onToggle={toggle} />
        : <FileList busyIds={actions.busyIds} items={items} label={kindLabel} onOpen={setOpen} onReplace={actions.askReplace} onRetire={item => void retireOne(item)} />)}
      {!list.isPending && <Pager compact={!isWide} pager={pager} />}

      {selecting && selected.length > 0 && (
        <div className="sticky bottom-20 z-10 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-foreground px-4 py-3 text-background shadow-overlay lg:bottom-4">
          <span className="text-sm font-semibold">{t('media.select.count', { count: selected.length })}</span>
          {kept > 0 && <span className="text-xs text-background/80">{t('media.select.blocked', { count: kept })}</span>}
          <span className="ms-auto flex gap-2">
            <Button className="max-lg:h-11" size="sm" variant="tertiary" onPress={() => setSelected([])}>{t('media.select.clear')}</Button>
            <Button className="max-lg:h-11" isDisabled={!retirable.length} size="sm" variant="secondary" onPress={() => void retireChosen()}>{t('media.select.retire', { count: retirable.length })}</Button>
          </span>
        </div>
      )}

      <MediaSheet
        actions={{ askReplace: actions.askReplace, retire: item => void retireOne(item), save: (item, details) => void actions.save(item, details) }}
        busy={!!shown && actions.busyIds.includes(shown.id)}
        item={shown}
        refused={!!shown && refusedId === shown.id}
        storeId={storeId}
        onClose={() => {
          setOpen(null)
          setRefusedId(null)
        }}
        onDismissRefusal={() => setRefusedId(null)}
      />
      {actions.elements}
    </div>
  )
}

/** N18: the media library of the store. A new shop with no files sees the empty state; Upload stays in the header. */
export function MediaScreen({ search, onSearch }: { search: MediaSearch, onSearch: (patch: Partial<MediaSearch>) => void }) {
  return <MediaGate fallback={<LoadingScreen />}>{storeId => <Library search={search} storeId={storeId} onSearch={onSearch} />}</MediaGate>
}
