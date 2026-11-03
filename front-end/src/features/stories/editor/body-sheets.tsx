import type { Editor } from '@tiptap/react'
import type { StoryLanguage } from '../lib/search-params'

import { useLocale } from '@/contexts/locale-context'
import { InsertSheet } from '../components/insert-sheet'
import { PinChoiceSheet } from '../components/pin-choice-sheet'
import { insertMediaBlock, liveMediaCount } from './media-commands'
import { applyPinLink } from './pin-commands'

export type BodySheet = { kind: 'insert', tab: 'image' | 'video' | 'audio' } | { kind: 'pin', current: string }

/**
 * The two sheets the body editor opens, mounted only while one is open (so an editor without library or pins never reads them). Both
 * are opened from the page, never from another sheet. The Insert sheet reads the live count of media and the editor refuses at the limit.
 */
export function BodySheets({ editor, storeId, language, sheet, onClose }: {
  editor: Editor
  storeId: string
  language: StoryLanguage
  sheet: BodySheet | null
  onClose: () => void
}) {
  const { t } = useLocale()

  if (sheet?.kind === 'insert') {
    return (
      <InsertSheet
        isOpen
        firstTab={sheet.tab}
        getMediaCount={() => liveMediaCount(editor)}
        language={language}
        storeId={storeId}
        onClose={onClose}
        onInsert={node => insertMediaBlock(editor, node)}
      />
    )
  }
  if (sheet?.kind === 'pin') {
    return (
      <PinChoiceSheet
        isOpen
        current={sheet.current === '' ? undefined : sheet.current}
        doneLabel={t('storyMedia.pin.done')}
        language={language}
        note={t('storyMedia.pin.note')}
        storeId={storeId}
        title={t('storyMedia.pin.title')}
        onChoose={pin => applyPinLink(editor, pin)}
        onClose={onClose}
      />
    )
  }

  return null
}
