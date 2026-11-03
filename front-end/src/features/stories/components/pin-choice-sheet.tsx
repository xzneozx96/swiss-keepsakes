import type { PinOption } from '../lib/pins'
import type { StoryLanguage } from '../lib/search-params'

import { Button } from '@heroui/react'
import { useState } from 'react'

import { SheetFrame } from '@/components/sheet-frame'
import { useLocale } from '@/contexts/locale-context'
import { PinSearchList } from './pin-search-list'

/**
 * Choose one pin. The title, the done button and the note are props, so a story's "Place reviewed" uses the same sheet with
 * its own words. `current` is the pin already chosen (the sheet then opens as a change); nothing is chosen until a row is pressed.
 */
export function PinChoiceSheet({ storeId, language, isOpen, title, doneLabel, note, current, onChoose, onClose }: {
  storeId: string
  language: StoryLanguage
  isOpen: boolean
  title: string
  doneLabel: string
  note?: string
  current?: string
  onChoose: (pin: PinOption) => void
  onClose: () => void
}) {
  const { t } = useLocale()
  const [chosen, setChosen] = useState<PinOption | null>(null)
  const selected = chosen ? [chosen.id] : current ? [current] : []
  const close = () => {
    setChosen(null)
    onClose()
  }

  return (
    <SheetFrame
      footer={(
        <>
          <Button
            isDisabled={!chosen}
            onPress={() => {
              if (chosen)
                onChoose(chosen)
              close()
            }}
          >
            {doneLabel}
          </Button>
          <Button variant="tertiary" onPress={close}>{t('storyMedia.pin.cancel')}</Button>
        </>
      )}
      isOpen={isOpen}
      title={title}
      onClose={close}
    >
      {note && <p className="text-sm text-muted">{note}</p>}
      <PinSearchList language={language} selected={selected} storeId={storeId} onToggle={setChosen} />
    </SheetFrame>
  )
}
