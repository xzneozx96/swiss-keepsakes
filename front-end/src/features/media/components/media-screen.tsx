import type { MediaItem } from '@sk/api-contract'
import type { MediaSearch, StatusFilter, UseFilter } from '../lib/search-params'
import type { PagerState } from '@/components/list-pagination'

import { Skeleton, toast } from '@heroui/react'
import { useEffect, useState } from 'react'

import { ActionBar } from '@/components/action-bar'
import { EmptyState } from '@/components/empty-state'
import { FilterChips, filterGroup } from '@/components/filter-bar'
import { PhotoAddIcon, SearchIcon, TrashIcon, UploadIcon } from '@/components/icons'
import { ListAction, ListHeader, ListToolbar } from '@/components/layout/list-toolbar'
import { Pager } from '@/components/list-pagination'
import { useLocale } from '@/contexts/locale-context'
import { useIsWide } from '@/hooks/use-is-wide'
import { useListLoading } from '@/hooks/use-list-loading'
import { useMediaList } from '../api/queries'
import { useDuplicateCheck } from '../hooks/use-duplicate-check'
import { useMediaActions } from '../hooks/use-media-actions'
import { ACCEPT, checkFile, retireCheck } from '../lib/rules'
import { pageSizeOf, STATUS_FILTERS, USE_FILTERS } from '../lib/search-params'
import { FileList, ListSkeleton } from './file-list'
import { MediaGate } from './media-gate'
import { MediaSheet } from './media-sheet'
import { MediaToolbar } from './media-toolbar'
import { PhotoWall, WallSkeleton } from './photo-wall'

const SEARCH_DELAY_MS = 250
// How long the files a pick already had stay pointed out.
const FOUND_MS = 5000

// The file dialog also offers HEIC, so a refusal can say why (the type check names it).
const ACCEPT_UPLOAD = `${ACCEPT},.heic`

function UploadButton({ isBusy, onFiles }: { isBusy: boolean, onFiles: (files: File[]) => void }) {
  const { t } = useLocale()
  const [input, setInput] = useState<HTMLInputElement | null>(null)

  return (
    <>
      <ListAction icon={UploadIcon} isPending={isBusy} onPress={() => input?.click()}>{t('media.upload')}</ListAction>
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

  return <ListHeader action={upload} description={t('media.intro')} title={t('media.title')} />
}

/** The toolbar's shape while the store is unknown: tabs, search and the first tiles. */
function LoadingScreen() {
  const { t } = useLocale()

  return (
    <div aria-busy aria-label={t('media.loading')} className="flex flex-col gap-4" role="status">
      <Header upload={<Skeleton className="h-9 w-28 rounded-full max-lg:h-11 max-lg:w-full" />} />
      <ListToolbar search={<Skeleton className="h-10 w-full rounded-xl" />} tabs={<Skeleton className="h-10 w-full rounded-full lg:w-80" />} />
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
  const duplicates = useDuplicateCheck(storeId)
  const [checking, setChecking] = useState(false)
  const [found, setFound] = useState<string[]>([])
  const list = useMediaList(storeId, { kind, q: search.q, use: use.join(',') || undefined, status: status.join(',') || undefined, page, pageSize })
  const items = list.data?.items ?? []
  // A new filter, tab, search or page keeps the last rows on screen until the answer is late, then the skeleton takes over.
  const isLoading = useListLoading(list)

  // The URL follows the search box a moment after the last key, so each letter does not read the list.
  useEffect(() => {
    if (text === (search.q ?? ''))
      return
    const timer = setTimeout(() => onSearch({ q: text.trim() ? text : undefined, page: undefined }), SEARCH_DELAY_MS)

    return () => clearTimeout(timer)
  }, [text, search.q, onSearch])

  const foundShown = items.some(item => found.includes(item.id))

  useEffect(() => {
    if (found.length === 0)
      return
    const timer = setTimeout(setFound, FOUND_MS, [])

    return () => clearTimeout(timer)
  }, [found])

  // Once the pointed-out file is on screen (its page loaded), bring it into view.
  useEffect(() => {
    if (foundShown)
      found.map(id => document.querySelector(`[data-media="${id}"]`)).find(Boolean)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [found, foundShown])

  // Hashes the pick, asks about files the library already has, uploads the rest. A file kept as the existing one is
  // not uploaded: the list searches its name so it shows, and it is outlined for a moment.
  const pickFiles = async (files: File[]) => {
    setChecking(true)
    try {
      const decision = await duplicates.resolve(files, file => checkFile(file).ok)

      if (!decision)
        return
      const [first] = decision.reuse

      if (first) {
        const name = first.name

        setText(name)
        onSearch({ kind: first.kind === 'image' ? undefined : first.kind, q: name, use: undefined, status: undefined, page: undefined })
        setFound(decision.reuse.map(match => match.id))
        toast.info(t('media.duplicate.shown', { list: decision.reuse.map(match => match.name).join(', ') }))
      }
      void actions.upload(decision.upload)
    }
    finally {
      setChecking(false)
    }
  }

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
      <Header upload={<UploadButton isBusy={actions.isUploading || checking} onFiles={files => void pickFiles(files)} />} />
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
      <div aria-busy={isLoading || undefined} className="flex flex-col gap-4">
        {isLoading && (kind === 'image' ? <WallSkeleton /> : <ListSkeleton />)}
        {!isLoading && list.data && !items.length && <EmptyState icon={noFilter ? PhotoAddIcon : SearchIcon} message={t(noFilter && !Object.values(list.data.kinds).some(Boolean) ? 'media.empty.all' : 'media.empty.filtered')} />}
        {!isLoading && items.length > 0 && (kind === 'image'
          ? <PhotoWall busyIds={actions.busyIds} foundIds={found} items={items} label={kindLabel} selected={selected} selecting={selecting} onOpen={setOpen} onToggle={toggle} />
          : <FileList busyIds={actions.busyIds} foundIds={found} items={items} label={kindLabel} onOpen={setOpen} onReplace={actions.askReplace} onRetire={item => void retireOne(item)} />)}
        {!isLoading && <Pager compact={!isWide} pager={pager} />}
      </div>

      {selecting && selected.length > 0 && (
        <ActionBar
          actions={[{ icon: TrashIcon, label: t('media.select.delete'), ariaLabel: t('media.select.retire', { count: retirable.length }), tone: 'danger', isDisabled: !retirable.length, onPress: () => void retireChosen() }]}
          count={selected.length}
          note={kept > 0 ? t('media.select.blocked', { count: kept }) : undefined}
          onClear={() => setSelected([])}
        />
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
      {duplicates.dialog}
    </div>
  )
}

/** N18: the media library of the store. A new shop with no files sees the empty state; Upload stays in the header. */
export function MediaScreen({ search, onSearch }: { search: MediaSearch, onSearch: (patch: Partial<MediaSearch>) => void }) {
  return <MediaGate fallback={<LoadingScreen />}>{storeId => <Library search={search} storeId={storeId} onSearch={onSearch} />}</MediaGate>
}
