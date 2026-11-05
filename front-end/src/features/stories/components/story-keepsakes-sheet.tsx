import type { KeepsakeOption } from '../lib/linked-lists'

import type { StoryLanguage } from '../lib/search-params'
import { SearchField, Skeleton } from '@heroui/react'

import { useState } from 'react'
import { EmptyState } from '@/components/empty-state'
import { ErrorNotice } from '@/components/error-notice'
import { GiftIcon } from '@/components/icons'
import { Media } from '@/components/media'
import { useLocale } from '@/contexts/locale-context'
import { useSearchBox } from '@/hooks/use-search-box'
import { useKeepsakeOptions, useKeepsakeSearch } from '../hooks/use-keepsake-options'
import { MAX_KEEPSAKES, offeredKeepsakes, toggleLinked } from '../lib/linked-lists'
import { ChosenMark } from './chosen-mark'
import { PickerSheet } from './picker-sheet'

const TILE = 'relative flex w-full flex-col gap-2 rounded-2xl border-2 border-transparent bg-surface-secondary p-2 text-start outline-none focus-visible:focus-ring aria-pressed:border-accent disabled:opacity-60'

/** Tiles of the real shape while the list loads. */
function TilesSkeleton() {
  return (
    <ul aria-hidden className="grid grid-cols-2 gap-3 p-1 sm:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map(index => (
        <li key={index} className="flex flex-col gap-2 rounded-2xl bg-surface-secondary p-2">
          <Skeleton className="aspect-square rounded-xl" />
          <Skeleton className="h-4 w-2/3 rounded-md" />
        </li>
      ))}
    </ul>
  )
}

/**
 * Choose up to 6 published keepsakes, searched on the server as you type: tiles with a photo and a name (no price). The choice is a local draft that `onSave`
 * receives once, in the order of choosing, with the red order number on each chosen tile. A saved id that is no longer offered
 * (archived, unpublished) stays in the draft and counts toward the cap, so Save never drops a link silently; a line says so.
 */
export function KeepsakesSheet({ storeId, language, value, onSave, onClose }: {
  storeId: string
  language: StoryLanguage
  value: string[]
  onSave: (ids: string[]) => void
  onClose: () => void
}) {
  const { t } = useLocale()
  const [query, setQuery] = useState('')
  const [text, setText] = useSearchBox(query, setQuery)
  const found = useKeepsakeSearch(storeId, language, query)
  // The keepsakes already linked are read by id, so they stay on the list whatever the search says.
  const chosen = useKeepsakeOptions(storeId, language, value)
  const [draft, setDraft] = useState(value)
  // Every keepsake a search has shown, so one picked from an earlier search stays on the sheet (and can be unticked) after the search changes.
  const [seen, setSeen] = useState(() => new Map<string, KeepsakeOption>())
  const { isLoading, isError, refetch } = found

  if (found.keepsakes.some(option => !seen.has(option.id)))
    setSeen(new Map([...seen, ...found.keepsakes.map(option => [option.id, option] as const)]))
  const known = new Map([...seen, ...chosen.keepsakes.map(option => [option.id, option] as const)])
  const offered = offeredKeepsakes([...found.keepsakes, ...draft.flatMap(id => (found.keepsakes.some(option => option.id === id) ? [] : known.get(id) ?? []))])
  const hidden = chosen.isLoading || chosen.isError ? 0 : draft.filter(id => !known.get(id)?.published).length
  const full = draft.length >= MAX_KEEPSAKES

  return (
    <PickerSheet
      doneLabel={t('storyLists.keepsakes.save', { count: draft.length })}
      title={t('storyLists.keepsakes.sheetTitle')}
      onClose={onClose}
      onDone={() => onSave(draft)}
    >
      <SearchField aria-label={t('storyLists.keepsakes.search')} className="w-full" value={text} onChange={setText}>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input className="w-full" placeholder={t('storyLists.keepsakes.search')} />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>
      {full && <p className="text-sm text-muted">{t('storyLists.keepsakes.full')}</p>}
      {hidden > 0 && <p className="text-sm text-muted">{t(hidden === 1 ? 'storyLists.keepsakes.hiddenChosen.one' : 'storyLists.keepsakes.hiddenChosen.other', { count: hidden })}</p>}
      {isLoading && <TilesSkeleton />}
      {isError && <ErrorNotice compact message={t('storyLists.keepsakes.loadFailed')} onRetry={refetch} />}
      {!isLoading && !isError && offered.length === 0 && <EmptyState compact icon={GiftIcon} message={query.trim() ? t('storyLists.keepsakes.empty', { query: query.trim() }) : t('storyLists.keepsakes.none')} />}
      {offered.length > 0 && (
        <ul aria-label={t('storyLists.keepsakes.tiles')} className="grid grid-cols-2 gap-3 p-1 sm:grid-cols-3">
          {offered.map((option) => {
            const position = draft.indexOf(option.id)

            return (
              <li key={option.id}>
                <button
                  aria-pressed={position >= 0}
                  className={TILE}
                  disabled={full && position < 0}
                  type="button"
                  onClick={() => setDraft(toggleLinked(draft, option.id, MAX_KEEPSAKES))}
                >
                  <Media alt="" className="aspect-square rounded-xl" photo={option.photo ?? undefined}>
                    {!option.photo && <GiftIcon aria-hidden className="absolute inset-0 m-auto text-foreground/60" size={24} />}
                  </Media>
                  <span className="line-clamp-2 text-sm font-medium">{option.name}</span>
                  {position >= 0 && <ChosenMark order={position + 1} />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </PickerSheet>
  )
}
