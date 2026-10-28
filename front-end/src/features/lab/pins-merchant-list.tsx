import type { CopyKey } from './pins-merchant-copy'
import type { Pin, ShownStatus, StayTag } from './pins-merchant-data'
import type { ListState } from './pins-merchant-search-params'
import type { DataTableColumn } from '@/components/data-table'
import type { RowAction } from '@/components/row-actions'
import type { StatusTone } from '@/components/status-chip'

import { Button, SearchField, Tabs, toast } from '@heroui/react'
import { formatShortDate } from '@sk/domain/shared'
import { useState } from 'react'

import { useConfirm } from '@/components/confirm-dialog'
import { DataTable } from '@/components/data-table'
import { FilterButton, FilterChips, filterGroup, selectedLabels } from '@/components/filter-bar'
import {
  ArchiveIcon,
  ChevronRightIcon,
  EditIcon,
  PickupDateIcon,
  PickupIcon,
  PlusIcon,
  RestoreIcon,
  TrashIcon,
} from '@/components/icons'
import { STICKY_TABS } from '@/components/layout/sticky-tabs'
import { Media } from '@/components/media'
import { RowActions } from '@/components/row-actions'
import { StatusChip } from '@/components/status-chip'
import { useCopy } from './pins-merchant-copy'
import {
  categoryName,
  isEntryEnded,
  LAB_TODAY,
  lastEntry,
  mapCategories,
  nextEntry,
  shownStatus,
  STAY_TAGS,
  stories,
} from './pins-merchant-data'

type DatesFilter = 'has' | 'none'
type RowActionId = 'edit' | 'hide' | 'unhide' | 'delete'

const statusTone: Record<ShownStatus, StatusTone> = {
  draft: 'neutral',
  published: 'success',
  hidden: 'warning',
  ended: 'info',
}

const statusKey: Record<ShownStatus, CopyKey> = {
  draft: 'status.draft',
  published: 'status.published',
  hidden: 'status.hidden',
  ended: 'status.ended',
}

/** Content's own pages as a pinned tab row on phones (owner: phone tab rows stay at the top). */
function ContentTabs() {
  const { c } = useCopy()
  const tabs: CopyKey[] = ['nav.stories', 'nav.places', 'nav.categories', 'nav.tours', 'nav.media', 'nav.comments', 'nav.reviews']

  return (
    <div className={`overflow-x-auto py-2 lg:hidden ${STICKY_TABS}`}>
      <Tabs className="w-auto" selectedKey="nav.places">
        <Tabs.ListContainer className="w-fit">
          <Tabs.List aria-label={c('nav.contentPages')}>
            {tabs.map((tab, index) => (
              <Tabs.Tab key={tab} className="whitespace-nowrap" id={tab}>
                {index > 0 && <Tabs.Separator />}
                {c(tab)}
                <Tabs.Indicator />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>
    </div>
  )
}

/** What the list knows about one pin, in the dashboard's language. */
function useRowText() {
  const { c, language, intlLocale } = useCopy()
  const date = (iso: string) => formatShortDate(iso, LAB_TODAY, intlLocale)

  return {
    title: (p: Pin) => p.title[language] || p.title[language === 'en' ? 'de' : 'en'] || c('row.untitled'),
    languages: (p: Pin) => {
      const en = !!p.title.en.trim()
      const de = !!p.title.de.trim()

      return en && de ? c('lang.both') : c('lang.only', { lang: en ? 'EN' : 'DE' })
    },
    categories: (p: Pin) =>
      p.categories.length
        ? p.categories
            .map(id => mapCategories.find(m => m.id === id))
            .filter(m => !!m)
            .map(m => categoryName(m, language))
            .join(', ')
        : c('list.onlyAll'),
    next: (p: Pin) => {
      if (!p.dates.length)
        return c('next.none')
      const next = nextEntry(p.dates)

      if (!next)
        return c('next.ended', { date: date(lastEntry(p.dates)?.lastDay ?? '') })
      if (next.kind === 'range')
        return next.firstDay <= LAB_TODAY ? c('next.until', { date: date(next.lastDay) }) : `${date(next.firstDay)} – ${date(next.lastDay)}`

      return `${date(next.firstDay)}${next.startTime ? `, ${next.startTime}` : ''}`
    },
    stay: (p: Pin) => c(`stay.${p.stay}`),
    interests: (p: Pin) => p.interests.map(i => c(`interest.${i}`)).join(', '),
    story: (p: Pin) => {
      const story = stories.find(s => s.id === p.storyId)

      if (!story)
        return { text: c('story.none'), warn: false }
      const published = (['en', 'de'] as const).filter(l => story.versions[l] === 'published')

      return {
        text: story.title[language] || story.title[language === 'en' ? 'de' : 'en'],
        warn: published.length === 0,
      }
    },
    edited: (p: Pin) => date(p.edited),
  }
}

function StatusCell({ pin }: { pin: Pin }) {
  const { c } = useCopy()
  const status = shownStatus(pin)

  return <StatusChip tone={statusTone[status]}>{c(statusKey[status])}</StatusChip>
}

function rowActions(pin: Pin): RowActionId[] {
  if (pin.status === 'draft')
    return ['edit', 'delete']

  return pin.status === 'hidden' ? ['edit', 'unhide'] : ['edit', 'hide']
}

function PinActions({ pin, onAction }: { pin: Pin, onAction: (pin: Pin, id: RowActionId) => void }) {
  const { c } = useCopy()
  const text = useRowText()
  const all: Record<RowActionId, RowAction<RowActionId>> = {
    edit: { id: 'edit', label: c('row.edit'), icon: EditIcon },
    hide: { id: 'hide', label: c('row.hide'), icon: ArchiveIcon },
    unhide: { id: 'unhide', label: c('row.unhide'), icon: RestoreIcon },
    delete: { id: 'delete', label: c('row.delete'), icon: TrashIcon },
  }

  return (
    <RowActions
      actions={rowActions(pin).map(id => all[id])}
      label={c('row.actions', { name: text.title(pin) })}
      onAction={id => onAction(pin, id)}
    />
  )
}

/** Phones: one card per pin in the M03 ticket shape of the story list; the top opens the editor. */
function PinCards({ rows, label, onOpen, onAction }: {
  rows: Pin[]
  label: string
  onOpen: (pin: Pin) => void
  onAction: (pin: Pin, id: RowActionId) => void
}) {
  const { c } = useCopy()
  const text = useRowText()

  return (
    <ul aria-label={label} className="flex flex-col gap-5 lg:hidden">
      {rows.map((pin) => {
        const story = text.story(pin)

        return (
          <li key={pin.id} className="flex flex-col overflow-hidden rounded-3xl bg-surface shadow-surface">
            <div className="flex items-center gap-2 p-4 pe-2">
              <button
                className="flex min-w-0 flex-1 items-center gap-4 rounded-2xl text-start outline-none focus-visible:focus-ring"
                type="button"
                onClick={() => onOpen(pin)}
              >
                <Media alt="" className="size-16 shrink-0 rounded-xl" photo={pin.photo || undefined} />
                <span className="min-w-0 flex-1">
                  <span className="block text-lg leading-tight font-semibold text-pretty [overflow-wrap:anywhere]">{text.title(pin)}</span>
                  <span className="mt-2 block text-xs text-muted">{text.languages(pin)}</span>
                </span>
                <ChevronRightIcon aria-hidden className="shrink-0 text-muted" size={18} />
              </button>
              <PinActions pin={pin} onAction={onAction} />
            </div>
            <div className="flex flex-wrap gap-1.5 px-4 pb-4 [&_svg]:shrink-0">
              <StatusCell pin={pin} />
            </div>
            <dl className="flex flex-col gap-2 border-t border-dashed border-separator px-4 py-3.5 text-sm">
              {[
                { label: c('column.next'), value: text.next(pin) },
                { label: c('column.categories'), value: text.categories(pin) },
                { label: c('filter.stay'), value: text.stay(pin) },
                { label: c('interests.label'), value: text.interests(pin) || '–' },
                { label: c('column.story'), value: story.warn ? `${story.text} · ${c('story.notPublished')}` : story.text },
                { label: c('column.edited'), value: text.edited(pin) },
              ].map(fact => (
                <div key={fact.label} className="flex items-baseline justify-between gap-4">
                  <dt className="shrink-0 text-muted">{fact.label}</dt>
                  <dd className="text-end text-muted tabular-nums [overflow-wrap:anywhere]">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * N16 Places: the pins of the map, as the story list (M17) looks today. Search, one filter
 * button with every question, phone cards, a table from 1024px, and the ⋯ row menu. A
 * published pin can only be hidden; only a draft can be deleted (AC79).
 */
export function PinsList({ pins, onPinsChange, state, onOpen, onAdd }: {
  pins: Pin[]
  onPinsChange: (pins: Pin[]) => void
  state: ListState
  onOpen: (pin: Pin) => void
  onAdd: (kind: 'place' | 'event') => void
}) {
  const { c, language } = useCopy()
  const text = useRowText()
  const { confirm, dialog } = useConfirm()
  const [query, setQuery] = useState(state === 'nomatch' ? 'fondue' : '')
  const [status, setStatus] = useState<ShownStatus[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [stay, setStay] = useState<StayTag[]>([])
  const [dates, setDates] = useState<DatesFilter[]>([])
  const shown = state === 'empty' ? [] : pins

  const count = (test: (p: Pin) => boolean) => shown.filter(test).length
  const inCategory = (p: Pin, id: string) =>
    id === 'none'
      ? p.categories.length === 0
      : p.categories.some(own => own === id || mapCategories.find(m => m.id === own)?.parentId === id)

  const filterGroups = [
    filterGroup({
      id: 'status',
      label: c('filter.status'),
      options: (['draft', 'published', 'ended', 'hidden'] as const).map(id => ({
        id,
        label: c(id === 'ended' ? 'filter.ended' : statusKey[id]),
        count: count(p => shownStatus(p) === id),
      })),
      selected: status,
      onChange: setStatus,
    }),
    filterGroup({
      id: 'category',
      label: c('filter.category'),
      options: [
        ...mapCategories.map(m => ({
          id: m.id,
          label: m.parentId ? `· ${categoryName(m, language)}` : categoryName(m, language),
          count: count(p => inCategory(p, m.id)),
        })),
        { id: 'none', label: c('filter.noCategory'), count: count(p => inCategory(p, 'none')) },
      ],
      selected: categories,
      onChange: setCategories,
    }),
    filterGroup({
      id: 'stay',
      label: c('filter.stay'),
      options: STAY_TAGS.map(id => ({ id, label: c(`stay.${id}`), count: count(p => p.stay === id) })),
      selected: stay,
      onChange: setStay,
    }),
    filterGroup({
      id: 'dates',
      label: c('filter.dates'),
      options: [
        { id: 'has' as const, label: c('filter.hasDates'), count: count(p => p.dates.length > 0) },
        { id: 'none' as const, label: c('filter.noDates'), count: count(p => p.dates.length === 0) },
      ],
      selected: dates,
      onChange: setDates,
    }),
  ]

  const needle = query.trim().toLowerCase()
  const rows = shown
    .filter(p => !status.length || status.includes(shownStatus(p)))
    .filter(p => !categories.length || categories.some(id => inCategory(p, id)))
    .filter(p => !stay.length || stay.includes(p.stay))
    .filter(p => !dates.length || dates.includes(p.dates.length ? 'has' : 'none'))
    .filter(p => !needle || [p.title.en, p.title.de, p.slug, p.address].some(v => v.toLowerCase().includes(needle)))
    .sort((a, b) => b.edited.localeCompare(a.edited))
  const label = selectedLabels(filterGroups.flatMap(g => g.options), [...status, ...categories, ...stay, ...dates], c('list.all'))

  const onAction = async (pin: Pin, id: RowActionId) => {
    const name = text.title(pin)

    if (id === 'edit') {
      onOpen(pin)

      return
    }
    if (id === 'unhide') {
      onPinsChange(pins.map(p => (p.id === pin.id ? { ...p, status: 'published' } : p)))
      toast.success(c('toast.shown', { name }))

      return
    }
    const isHide = id === 'hide'
    const ok = await confirm({
      title: c(isHide ? 'hide.title' : 'delete.title', { name }),
      body: c(isHide ? 'hide.body' : 'delete.body'),
      confirmLabel: c(isHide ? 'hide.confirm' : 'delete.confirm'),
    })

    if (!ok)
      return
    onPinsChange(isHide ? pins.map(p => (p.id === pin.id ? { ...p, status: 'hidden' } : p)) : pins.filter(p => p.id !== pin.id))
    toast.success(c(isHide ? 'toast.hidden' : 'toast.deleted', { name }))
  }

  const columns: DataTableColumn<Pin>[] = [
    {
      id: 'pin',
      header: c('column.pin'),
      skeleton: 'lead',
      isRowHeader: true,
      headerClassName: 'min-w-56',
      render: pin => (
        <div className="flex items-center gap-3">
          <Media alt="" className="size-12 shrink-0 rounded-lg" photo={pin.photo || undefined} />
          <div className="flex min-w-0 flex-col items-start">
            <button className="rounded text-start font-semibold outline-none hover:underline focus-visible:focus-ring" type="button" onClick={() => onOpen(pin)}>
              {text.title(pin)}
            </button>
            <span className="text-label text-muted">{text.languages(pin)}</span>
          </div>
        </div>
      ),
    },
    { id: 'status', header: c('column.status'), skeleton: 'chip', cellClassName: 'py-2', render: pin => <StatusCell pin={pin} /> },
    { id: 'categories', header: c('column.categories'), cellClassName: 'text-sm', render: pin => text.categories(pin) },
    {
      id: 'next',
      header: c('column.next'),
      cellClassName: 'whitespace-nowrap text-sm tabular-nums',
      render: (pin) => {
        const isOver = pin.dates.length > 0 && pin.dates.every(isEntryEnded)

        return <span className={pin.dates.length && !isOver ? '' : 'text-muted'}>{text.next(pin)}</span>
      },
    },
    {
      id: 'tags',
      header: c('column.tags'),
      cellClassName: 'text-sm',
      render: pin => (
        <div className="flex flex-col">
          <span>{text.stay(pin)}</span>
          <span className="text-label text-muted">{text.interests(pin) || '–'}</span>
        </div>
      ),
    },
    {
      id: 'story',
      header: c('column.story'),
      cellClassName: 'text-sm',
      render: (pin) => {
        const story = text.story(pin)

        return (
          <div className="flex flex-col">
            <span className={pin.storyId ? '' : 'text-muted'}>{story.text}</span>
            {story.warn && <span className="text-label text-warning">{c('story.notPublished')}</span>}
          </div>
        )
      },
    },
    { id: 'edited', header: c('column.edited'), cellClassName: 'whitespace-nowrap text-sm tabular-nums', render: pin => text.edited(pin) },
  ]

  return (
    <div className="flex flex-col gap-4">
      <ContentTabs />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-title">{c('list.title')}</h1>
          <p className="text-sm text-pretty text-muted">{c('list.intro')}</p>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-2 lg:flex">
          <Button className="max-lg:h-11" onPress={() => onAdd('place')}>
            <PickupIcon aria-hidden size={16} />
            {c('list.addPlace')}
          </Button>
          <Button className="max-lg:h-11" variant="secondary" onPress={() => onAdd('event')}>
            <PickupDateIcon aria-hidden size={16} />
            {c('list.addEvent')}
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <SearchField aria-label={c('list.search')} className="w-full lg:max-w-sm" value={query} onChange={setQuery}>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input className="w-full" placeholder={c('list.search')} />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        <FilterButton groups={filterGroups} />
      </div>
      <FilterChips groups={filterGroups} />
      <DataTable
        cards={page => <PinCards label={label} rows={page} onAction={(pin, id) => void onAction(pin, id)} onOpen={onOpen} />}
        columns={columns}
        empty={{ icon: shown.length ? PlusIcon : PickupIcon, message: c(shown.length ? 'empty.filtered' : 'empty.all') }}
        getRowId={pin => pin.id}
        isLoading={state === 'loading'}
        label={label}
        resetKey={`${label}|${query}`}
        rowActions={{ render: pin => <PinActions pin={pin} onAction={(p, id) => void onAction(p, id)} /> }}
        rows={rows}
      />
      {dialog}
    </div>
  )
}
