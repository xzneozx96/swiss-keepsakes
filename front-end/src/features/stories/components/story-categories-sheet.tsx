import type { MerchantCategory } from '@sk/api-contract'
import type { StoryLanguage } from '../lib/search-params'

import { Button, SearchField, Skeleton } from '@heroui/react'
import { useState } from 'react'

import { MinusIcon } from '@/components/icons'
import { SheetFrame } from '@/components/sheet-frame'
import { useLocale } from '@/contexts/locale-context'
import { categoryLabel, includedParents, MAX_STORY_CATEGORIES, toggleCategory, visibleCategories } from '../lib/categories'
import { ChosenMark } from './chosen-mark'

/** The category editor's (N23) connector: a sub-category hangs under its parent. */
function Connector() {
  return <span aria-hidden className="h-4 w-3 shrink-0 self-start rounded-bl-md border-s-2 border-b-2 border-separator" />
}

/** Rows of the real height while the list loads. */
function RowSkeletons() {
  return (
    <ul aria-hidden className="flex flex-col gap-2 p-1">
      {[0, 1, 2, 3].map(index => (
        <li key={index} className="flex min-h-11 items-center rounded-2xl bg-surface-secondary px-3 py-2">
          <span className="flex flex-col gap-1">
            <Skeleton className="h-4 w-32 rounded-lg" />
            <Skeleton className="h-3 w-24 rounded-lg" />
          </span>
        </li>
      ))}
    </ul>
  )
}

/**
 * The shared sheet "Blog categories": search over both languages and the tree as tappable rows in the app's selected pattern
 * (red border and tick; a dashed border and a minus for a parent the story is in through a sub-category). The choice is a local
 * draft that `onSave` receives once; the rules are `toggleCategory` (design 6.1) and only categories that exist are listed.
 */
export function StoryCategoriesSheet({ categories, value, isLoading, onSave, onClose }: {
  /** The store's blog categories; undefined while they load. */
  categories: MerchantCategory[] | undefined
  value: string[]
  isLoading: boolean
  onSave: (ids: string[]) => void
  onClose: () => void
}) {
  const { t } = useLocale()
  const [draft, setDraft] = useState(value)
  const [query, setQuery] = useState('')
  const all = categories ?? []
  const shown = visibleCategories(all, query)
  const included = includedParents(draft, all)
  // The merchant reads English first, with the German name under it.
  const english: StoryLanguage = 'en'
  const nameOf = (id: string) => categoryLabel(all.find(item => item.id === id)!, english)

  return (
    <SheetFrame
      isOpen
      footer={(
        <>
          <Button fullWidth className="min-h-11" onPress={() => onSave(draft)}>{t('storyDetails.categories.save')}</Button>
          <Button fullWidth className="min-h-11" variant="tertiary" onPress={onClose}>{t('categories.sheet.cancel')}</Button>
        </>
      )}
      title={t('storyDetails.categories.title')}
      onClose={onClose}
    >
      <SearchField aria-label={t('storyDetails.categories.search')} className="w-full" value={query} onChange={setQuery}>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input className="w-full" placeholder={t('storyDetails.categories.search')} />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>
      <p className="-mt-2 text-xs text-pretty text-muted">
        {draft.length >= MAX_STORY_CATEGORIES ? t('storyDetails.categories.max', { count: MAX_STORY_CATEGORIES }) : t('storyDetails.categories.help')}
      </p>
      {isLoading && <RowSkeletons />}
      {!isLoading && shown.length === 0 && <p className="py-6 text-center text-sm text-muted">{t('storyDetails.categories.noMatch', { query: query.trim() })}</p>}
      {shown.length > 0 && (
        <ul aria-label={t('storyDetails.categories.list')} className="flex flex-col gap-2 p-1">
          {shown.map((category) => {
            const chosen = draft.includes(category.id)
            const isIncluded = included.includes(category.id)
            const through = draft.filter(id => all.find(item => item.id === id)?.parentId === category.id).map(nameOf).join(', ')

            return (
              <li key={category.id} className={category.parentId ? 'flex items-center gap-2 ps-3' : ''}>
                {category.parentId && <Connector />}
                <button
                  aria-pressed={chosen}
                  className={`relative flex min-h-11 w-full min-w-0 items-center rounded-2xl border-2 bg-surface-secondary px-3 py-2 text-start outline-none focus-visible:focus-ring ${chosen ? 'border-accent' : isIncluded ? 'border-dashed border-separator' : 'border-transparent'}`}
                  type="button"
                  onClick={() => setDraft(toggleCategory(draft, category.id, all))}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="text-sm font-medium">{categoryLabel(category, english)}</span>
                    <span className="text-xs text-muted">
                      {isIncluded
                        ? t('storyDetails.categories.includedRow', { child: through, parent: categoryLabel(category, english) })
                        : category.name.en && category.name.de ? category.name.de : t('storyDetails.categories.noGerman')}
                    </span>
                  </span>
                  {chosen && <ChosenMark />}
                  {isIncluded && <MinusIcon aria-label={t('storyDetails.categories.includedMark')} className="absolute -end-1 -top-1 size-4.5 rounded-full bg-surface text-muted" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </SheetFrame>
  )
}
