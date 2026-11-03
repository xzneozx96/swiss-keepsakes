import type { PinOption } from '../lib/pins'
import type { StoryLanguage } from '../lib/search-params'

import { SearchField, Skeleton } from '@heroui/react'
import { useState } from 'react'

import { EmptyState } from '@/components/empty-state'
import { PickupIcon, SearchIcon } from '@/components/icons'
import { Pager, usePaged } from '@/components/list-pagination'
import { Media } from '@/components/media'
import { useLocale } from '@/contexts/locale-context'
import { usePinOptions } from '../hooks/use-pin-options'
import { pinRowLine } from '../lib/pins'
import { CHOICE_ROW } from './choice-row'
import { ChosenMark } from './chosen-mark'

const SKELETON_ROWS = 5

/** Rows shaped like the real ones: the photo, the name and the line under it. */
export function RowsSkeleton() {
  return (
    <ul aria-hidden className="flex flex-col gap-2 p-1">
      {Array.from({ length: SKELETON_ROWS }, (_, i) => (
        <li key={i} className="flex min-h-12 items-center gap-3 rounded-2xl bg-surface-secondary p-3">
          <Skeleton className="size-11 shrink-0 rounded-xl" />
          <span className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-1/2 rounded-md" />
            <Skeleton className="h-3 w-2/3 rounded-md" />
          </span>
        </li>
      ))}
    </ul>
  )
}

function PinRow({ pin, selected, onPress }: { pin: PinOption, selected: boolean, onPress: () => void }) {
  const { t } = useLocale()

  return (
    <button aria-pressed={selected} className={CHOICE_ROW} type="button" onClick={onPress}>
      <Media alt="" className="size-11 shrink-0 rounded-xl" photo={pin.photo ?? undefined}>
        {!pin.photo && <PickupIcon aria-hidden className="absolute inset-0 m-auto text-foreground/60" size={20} />}
      </Media>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">{pin.name}</span>
        <span className="truncate text-xs text-muted">{pinRowLine(t, pin)}</span>
      </span>
      {selected && <ChosenMark />}
    </button>
  )
}

/**
 * The store's pins as searchable rows, read once and filtered here. It is controlled: the parent holds `selected` and
 * decides whether a press chooses one pin or toggles several. Any pin can be chosen, published or not; an unpublished
 * one shows as plain text to guests (ADR-011).
 */
export function PinSearchList({ storeId, language, selected, onToggle }: {
  storeId: string
  language: StoryLanguage
  selected: string[]
  onToggle: (pin: PinOption) => void
}) {
  const { t } = useLocale()
  const { pins, isLoading, isError } = usePinOptions(storeId, language)
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()
  const shown = pins.filter(pin => pin.name.toLowerCase().includes(needle))
  const { pageItems, pager } = usePaged(shown, needle)

  return (
    <div className="flex flex-col gap-4">
      <SearchField aria-label={t('storyMedia.pin.search')} className="w-full" value={query} onChange={setQuery}>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input className="w-full" placeholder={t('storyMedia.pin.search')} />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>
      {isLoading && <RowsSkeleton />}
      {isError && <EmptyState compact icon={SearchIcon} message={t('storyMedia.pin.loadFailed')} />}
      {!isLoading && !isError && shown.length === 0 && <EmptyState compact icon={SearchIcon} message={needle ? t('storyMedia.pin.empty', { query: query.trim() }) : t('storyMedia.pin.none')} />}
      {shown.length > 0 && (
        <ul className="flex flex-col gap-2 p-1">
          {pageItems.map(pin => (
            <li key={pin.id}>
              <PinRow pin={pin} selected={selected.includes(pin.id)} onPress={() => onToggle(pin)} />
            </li>
          ))}
        </ul>
      )}
      {!isLoading && <Pager compact pager={pager} />}
    </div>
  )
}
