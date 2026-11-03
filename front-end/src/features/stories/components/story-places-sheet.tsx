import type { StoryLanguage } from '../lib/search-params'

import { useState } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { MAX_PLACES, toggleLinked } from '../lib/linked-lists'
import { PickerSheet } from './picker-sheet'
import { PinSearchList } from './pin-search-list'

/**
 * Choose the pins the story is about. The choice is a local draft that `onSave` receives once, in the order of choosing;
 * any pin can be chosen, up to 50 (the contract's cap). Saving with none is allowed: it clears the list.
 */
export function PlacesSheet({ storeId, language, value, onSave, onClose }: {
  storeId: string
  language: StoryLanguage
  value: string[]
  onSave: (ids: string[]) => void
  onClose: () => void
}) {
  const { t } = useLocale()
  const [draft, setDraft] = useState(value)

  return (
    <PickerSheet
      doneLabel={t(draft.length === 1 ? 'storyLists.places.save.one' : 'storyLists.places.save.other', { count: draft.length })}
      title={t('storyLists.places.sheetTitle')}
      onClose={onClose}
      onDone={() => onSave(draft)}
    >
      {draft.length >= MAX_PLACES && <p className="text-sm text-muted">{t('storyLists.places.full', { count: MAX_PLACES })}</p>}
      <PinSearchList language={language} selected={draft} storeId={storeId} onToggle={pin => setDraft(toggleLinked(draft, pin.id, MAX_PLACES))} />
    </PickerSheet>
  )
}
