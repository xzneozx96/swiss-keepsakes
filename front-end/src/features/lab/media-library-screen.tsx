import type { MediaFilters, MediaKind, MediaRow, MediaStatus, UseFilter } from './media-data'
import type { LabState } from './media-search-params'
import type { Library } from './media-state'

import { Button, Drawer, SearchField, Skeleton, Tabs } from '@heroui/react'
import { useState } from 'react'

import { useConfirm } from '@/components/confirm-dialog'
import { EmptyState } from '@/components/empty-state'
import { FilterButton, FilterChips, filterGroup } from '@/components/filter-bar'
import { PhotoAddIcon, SearchIcon, SelectedIcon } from '@/components/icons'
import { Pager, usePaged } from '@/components/list-pagination'
import { useIsWide } from '@/hooks/use-is-wide'
import { useFileActions } from './media-actions'
import { mc } from './media-copy'
import { filterMedia, retireCheck, usageOf } from './media-data'
import { FileMenu, MediaDetail, StatusTag, Thumb, UploadButton, UsageText } from './media-parts'
import { libraryRules as rules } from './media-rules'
import { ContentTabs, MediaHeader } from './media-shell'
import { RACE_ID } from './media-state'

const KINDS: MediaKind[] = ['image', 'audio', 'pdf']
const USES: UseFilter[] = ['unused', 'drafts', 'published']
const STATUSES: MediaStatus[] = ['processing', 'ready', 'retired']
/** A page of the wall: four rows of six on a laptop, eight rows of three on a phone. */
const WALL_PAGE = 24

function Tile({ row, lib, selecting, selected, onPress }: {
  row: MediaRow
  lib: Library
  selecting: boolean
  selected: boolean
  onPress: () => void
}) {
  const usage = usageOf(row.id, lib.refs, rules)

  return (
    <button
      aria-label={selecting ? mc('select.toggle', { name: row.name }) : row.name}
      aria-pressed={selecting ? selected : undefined}
      className="flex w-full flex-col gap-1 rounded-xl text-start outline-none focus-visible:focus-ring"
      type="button"
      onClick={onPress}
    >
      <span className={`relative block w-full overflow-hidden rounded-xl ${selected ? 'ring-2 ring-foreground ring-offset-2' : ''}`}>
        <Thumb className="aspect-square w-full rounded-xl" row={row} />
        {!usage.pages.length && row.status === 'ready' && (
          <span className="absolute start-1.5 bottom-1.5 rounded-full bg-surface/90 px-2 py-0.5 text-[11px] font-semibold">{mc('grid.unused')}</span>
        )}
        {row.status === 'retired' && (
          <span className="absolute start-1.5 bottom-1.5">
            <StatusTag row={row} />
          </span>
        )}
        {selecting && (
          <span aria-hidden className={`absolute end-1.5 top-1.5 flex size-6 items-center justify-center rounded-full border-2 ${selected ? 'border-surface bg-surface text-foreground' : 'border-surface/90 bg-foreground/20'}`}>
            {selected && <SelectedIcon size={22} weight="Filled" />}
          </span>
        )}
      </span>
      <span aria-hidden className="truncate px-0.5 text-xs text-muted">{row.name}</span>
    </button>
  )
}

function FileRow({ row, lib, actions, onOpen }: { row: MediaRow, lib: Library, actions: ReturnType<typeof useFileActions>, onOpen: () => void }) {
  return (
    <li className="flex items-center gap-2 py-2 pe-1">
      <button className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-start outline-none focus-visible:focus-ring" type="button" onClick={onOpen}>
        <Thumb row={row} />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold">{row.name}</span>
          <span className="truncate text-xs text-muted">{row.alt.en || mc('alt.missing')}</span>
          <span className="text-xs">
            <UsageText usage={usageOf(row.id, lib.refs, rules)} />
          </span>
        </span>
      </button>
      <StatusTag row={row} />
      <FileMenu actions={actions} refs={lib.refs} row={row} rules={rules} onOpen={onOpen} />
    </li>
  )
}

/**
 * N18, option B (the owner's pick): a photo wall per kind with a selection bar for clearing out
 * many files at once, lists for audio and PDFs, and the detail in a sheet.
 */
export function MediaLibrary({ lib, state }: { lib: Library, state: LabState }) {
  const isWide = useIsWide()
  const actions = useFileActions(lib, rules)
  const { confirm, dialog } = useConfirm()
  const [kind, setKind] = useState<MediaKind>('image')
  const [query, setQuery] = useState(state === 'nomatch' ? 'fondue' : '')
  const [use, setUse] = useState<UseFilter[]>([])
  const [statuses, setStatuses] = useState<MediaStatus[]>([])
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [openId, setOpenId] = useState<string | null>(state === 'refused' ? RACE_ID : null)
  const open = lib.rows.find(r => r.id === openId) ?? null
  const isLoading = state === 'loading'

  const base: MediaFilters = { query: '', kinds: [kind], use: [], statuses: [] }
  const count = (patch: Partial<typeof base>) => filterMedia(lib.rows, lib.refs, { ...base, ...patch }, rules).length
  const groups = [
    filterGroup({ id: 'use', label: mc('filter.use'), options: USES.map(id => ({ id, label: mc(`use.${id}`), count: count({ use: [id] }) })), selected: use, onChange: setUse }),
    filterGroup({ id: 'status', label: mc('filter.status'), options: STATUSES.map(id => ({ id, label: mc(`status.${id}`), count: count({ statuses: [id] }) })), selected: statuses, onChange: setStatuses }),
  ]
  const rows = filterMedia(lib.rows, lib.refs, { query, kinds: [kind], use, statuses }, rules)
  // The shared pager: 24 a page on the photo wall, the default 10 for audio and PDF lists.
  const { pageItems: pageRows, pager } = usePaged(rows, `${kind}|${query}|${use.join()}|${statuses.join()}`, kind === 'image' ? WALL_PAGE : undefined)

  const chosen = lib.rows.filter(r => selected.includes(r.id))
  const retirable = chosen.filter(r => retireCheck(r, lib.refs, rules).ok)
  const kept = chosen.length - retirable.length

  const toggle = (id: string) => setSelected(current => (current.includes(id) ? current.filter(x => x !== id) : [...current, id]))
  const stopSelecting = () => {
    setSelecting(false)
    setSelected([])
  }
  const retireSelected = async () => {
    const ok = await confirm({
      title: mc('select.retire', { count: retirable.length }),
      body: `${mc('retire.body')}${kept ? ` ${mc('select.blocked', { count: kept })}.` : ''}`,
      confirmLabel: mc('retire.confirm'),
      cancelLabel: mc('retire.cancel'),
    })

    if (!ok)
      return
    lib.retireMany(retirable, kept)
    stopSelecting()
  }

  const empty = !isLoading && !rows.length && (
    <EmptyState icon={lib.rows.length ? SearchIcon : PhotoAddIcon} message={mc(lib.rows.length ? 'empty.filtered' : 'empty.all')} />
  )

  return (
    <div className="flex flex-col gap-4">
      <ContentTabs />
      <MediaHeader intro={mc('intro')} upload={<UploadButton className="max-lg:w-full" lib={lib} />} />
      {/* Phones: the kind tabs share the full width. From 1024 px one row: tabs fit their labels on the left, search, filter and Select on the right. */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <div className="lg:shrink-0">
          <Tabs
            className="w-full lg:w-fit"
            selectedKey={kind}
            onSelectionChange={(key) => {
              setKind(key as MediaKind)
              stopSelecting()
            }}
          >
            <Tabs.ListContainer className="w-full lg:w-fit">
              <Tabs.List aria-label={mc('filter.kind')} className="w-full lg:w-auto">
                {KINDS.map((id, index) => (
                  <Tabs.Tab key={id} className="flex-1 whitespace-nowrap lg:w-auto lg:flex-none" id={id}>
                    {index > 0 && <Tabs.Separator />}
                    {`${mc(`kind.${id}`)} · ${lib.rows.filter(r => r.kind === id).length}`}
                    <Tabs.Indicator />
                  </Tabs.Tab>
                ))}
              </Tabs.List>
            </Tabs.ListContainer>
          </Tabs>
        </div>
        <div className="flex min-w-0 items-center gap-2 lg:flex-1 lg:justify-end">
          <SearchField aria-label={mc('search.name')} className="w-full lg:max-w-xs" value={query} onChange={setQuery}>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input className="w-full" placeholder={mc('search.name')} />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <FilterButton groups={groups} />
          <Button className="shrink-0 max-lg:h-11" size="sm" variant={selecting ? 'primary' : 'secondary'} onPress={() => (selecting ? stopSelecting() : setSelecting(true))}>
            {selecting ? mc('select.stop') : mc('select.start')}
          </Button>
        </div>
      </div>
      <FilterChips groups={groups} />

      {isLoading && (
        <ul aria-hidden className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }, (_, i) => (
            <li key={i}>
              <Skeleton className="aspect-square w-full rounded-xl" />
            </li>
          ))}
        </ul>
      )}
      {empty}
      {!isLoading && rows.length > 0 && (kind === 'image'
        ? (
            <ul aria-label={mc('kind.image')} className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {pageRows.map(row => (
                <li key={row.id}>
                  <Tile lib={lib} row={row} selected={selected.includes(row.id)} selecting={selecting} onPress={() => (selecting ? toggle(row.id) : setOpenId(row.id))} />
                </li>
              ))}
            </ul>
          )
        : (
            <ul aria-label={mc(`kind.${kind}`)} className="flex flex-col divide-y divide-separator rounded-3xl bg-surface px-4 py-1 shadow-surface">
              {pageRows.map(row => <FileRow key={row.id} actions={actions} lib={lib} row={row} onOpen={() => setOpenId(row.id)} />)}
            </ul>
          ))}
      {!isLoading && <Pager compact={!isWide} pager={pager} />}

      {selecting && selected.length > 0 && (
        <div className="sticky bottom-20 z-10 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-foreground px-4 py-3 text-background shadow-overlay lg:bottom-4">
          <span className="text-sm font-semibold">{mc('select.count', { count: selected.length })}</span>
          {kept > 0 && <span className="text-xs text-background/80">{mc('select.blocked', { count: kept })}</span>}
          <span className="ms-auto flex gap-2">
            <Button className="max-lg:h-11" size="sm" variant="tertiary" onPress={() => setSelected([])}>{mc('select.clear')}</Button>
            <Button className="max-lg:h-11" isDisabled={!retirable.length} size="sm" variant="secondary" onPress={() => void retireSelected()}>{mc('select.retire', { count: retirable.length })}</Button>
          </span>
        </div>
      )}

      <Drawer.Backdrop isOpen={!!open} onOpenChange={value => !value && setOpenId(null)}>
        {/* The width sits on the panel: Drawer.Content is the full-screen positioner. */}
        <Drawer.Content className={isWide ? undefined : 'mx-auto max-w-[560px]'} placement={isWide ? 'right' : 'bottom'}>
          <Drawer.Dialog className={`flex flex-col ${isWide ? 'h-full w-[26rem] max-w-full' : 'sheet-max'}`}>
            {!isWide && <Drawer.Handle />}
            <Drawer.Header className="flex items-center justify-between gap-3">
              <Drawer.Heading className="min-w-0 truncate text-heading">{open?.name}</Drawer.Heading>
              <Drawer.CloseTrigger aria-label="Close" />
            </Drawer.Header>
            <Drawer.Body className="overflow-y-auto pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
              {open && <MediaDetail actions={actions} lib={lib} row={open} rules={rules} />}
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
      {actions.elements}
      {dialog}
    </div>
  )
}
