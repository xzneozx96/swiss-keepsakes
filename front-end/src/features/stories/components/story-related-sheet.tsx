import type { StoryLanguage } from '../lib/search-params'

import { useState } from 'react'

import { EmptyState } from '@/components/empty-state'
import { ErrorNotice } from '@/components/error-notice'
import { ContentIcon } from '@/components/icons'
import { Media } from '@/components/media'
import { useLocale } from '@/contexts/locale-context'
import { useStoryOptions } from '../hooks/use-story-options'
import { MAX_RELATED, offeredStories, toggleLinked } from '../lib/linked-lists'
import { CHOICE_ROW } from './choice-row'
import { ChosenMark } from './chosen-mark'
import { PickerSheet } from './picker-sheet'
import { RowsSkeleton } from './pin-search-list'

/**
 * Choose up to 3 other stories to show at the end: rows with a photo, the title and the state of both language versions. The
 * choice is a local draft that `onSave` receives once, in the order of choosing. The story being edited is never offered. A saved
 * id the list no longer has stays in the draft and counts toward the cap, so Save never drops a link silently.
 */
export function RelatedSheet({ storeId, language, ownGroupId, value, onSave, onClose }: {
  storeId: string
  language: StoryLanguage
  ownGroupId: string
  value: string[]
  onSave: (ids: string[]) => void
  onClose: () => void
}) {
  const { t } = useLocale()
  const { stories, isLoading, isError, refetch } = useStoryOptions(storeId, language)
  const [draft, setDraft] = useState(value)
  const offered = offeredStories(stories, ownGroupId)
  const missing = isLoading || isError ? 0 : draft.filter(id => !stories.some(option => option.id === id)).length
  const full = draft.length >= MAX_RELATED

  return (
    <PickerSheet
      doneLabel={t('storyLists.related.save', { count: draft.length })}
      title={t('storyLists.related.sheetTitle')}
      onClose={onClose}
      onDone={() => onSave(draft)}
    >
      {full && <p className="text-sm text-muted">{t('storyLists.related.full')}</p>}
      {missing > 0 && <p className="text-sm text-muted">{t(missing === 1 ? 'storyLists.related.hiddenChosen.one' : 'storyLists.related.hiddenChosen.other', { count: missing })}</p>}
      {isLoading && <RowsSkeleton />}
      {isError && <ErrorNotice compact message={t('storyLists.related.loadFailed')} onRetry={refetch} />}
      {!isLoading && !isError && offered.length === 0 && <EmptyState compact icon={ContentIcon} message={t('storyLists.related.none')} />}
      {offered.length > 0 && (
        <ul aria-label={t('storyLists.related.rows')} className="flex flex-col gap-2 p-1">
          {offered.map((option) => {
            const position = draft.indexOf(option.id)

            return (
              <li key={option.id}>
                <button
                  aria-pressed={position >= 0}
                  className={CHOICE_ROW}
                  disabled={full && position < 0}
                  type="button"
                  onClick={() => setDraft(toggleLinked(draft, option.id, MAX_RELATED))}
                >
                  <Media alt="" className="size-11 shrink-0 rounded-xl" photo={option.photo ?? undefined}>
                    {!option.photo && <ContentIcon aria-hidden className="absolute inset-0 m-auto text-foreground/60" size={20} />}
                  </Media>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">{option.title}</span>
                    <span className="truncate text-xs text-muted">
                      {t('storyLists.related.line', { en: t(`storyLists.related.state.${option.states.en}`), de: t(`storyLists.related.state.${option.states.de}`) })}
                    </span>
                  </span>
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
