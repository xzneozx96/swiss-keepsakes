import type { StoryLanguage } from '../lib/search-params'

import { Skeleton } from '@heroui/react'
import { useState } from 'react'

import { EmptyState } from '@/components/empty-state'
import { ErrorNotice } from '@/components/error-notice'
import { GiftIcon } from '@/components/icons'
import { Media } from '@/components/media'
import { useLocale } from '@/contexts/locale-context'
import { useKeepsakeOptions } from '../hooks/use-keepsake-options'
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
 * Choose up to 6 published keepsakes: tiles with a photo and a name (no price). The choice is a local draft that `onSave`
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
  const { keepsakes, isLoading, isError, refetch } = useKeepsakeOptions(storeId, language)
  const [draft, setDraft] = useState(value)
  const offered = offeredKeepsakes(keepsakes)
  const hidden = isLoading || isError ? 0 : draft.filter(id => !offered.some(option => option.id === id)).length
  const full = draft.length >= MAX_KEEPSAKES

  return (
    <PickerSheet
      doneLabel={t('storyLists.keepsakes.save', { count: draft.length })}
      title={t('storyLists.keepsakes.sheetTitle')}
      onClose={onClose}
      onDone={() => onSave(draft)}
    >
      {full && <p className="text-sm text-muted">{t('storyLists.keepsakes.full')}</p>}
      {hidden > 0 && <p className="text-sm text-muted">{t(hidden === 1 ? 'storyLists.keepsakes.hiddenChosen.one' : 'storyLists.keepsakes.hiddenChosen.other', { count: hidden })}</p>}
      {isLoading && <TilesSkeleton />}
      {isError && <ErrorNotice compact message={t('storyLists.keepsakes.loadFailed')} onRetry={refetch} />}
      {!isLoading && !isError && offered.length === 0 && <EmptyState compact icon={GiftIcon} message={t('storyLists.keepsakes.none')} />}
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
