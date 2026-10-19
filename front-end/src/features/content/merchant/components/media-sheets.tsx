import { Button, Label, Radio, RadioGroup } from '@heroui/react'
import { useState } from 'react'

import { SelectedIcon } from '@/components/icons'

import { InfoNote } from '@/components/info-note'
import { Media } from '@/components/media'
import { SheetFrame } from '@/components/sheet-frame'
import { useLocale } from '@/contexts/locale-context'
import { libraryAudio, libraryPhotos } from '../lib/media-library'

const DASHES = /-/g
const TRAILING_NUMBER = /-\d+$/

/** Same choice card as M08, M15 and the M04 sheets: ink frame when selected. */
const choiceCard
  = 'rounded-2xl border border-separator p-3 data-[selected=true]:border-foreground data-[selected=true]:ring-1 data-[selected=true]:ring-foreground'

/** "lucerne-old-town" → "lucerne old town", to name a photo without a caption. */
const readable = (slug: string) => slug.replace(TRAILING_NUMBER, '').replace(DASHES, ' ')

/**
 * The cover or an inline photo, chosen from the shop's photo library: in the prototype the
 * library stands in for an upload (R17), so every choice renders on C20.
 */
export function PhotoSheet({
  value,
  onChoose,
  onClose,
}: {
  value: string
  onChoose: (photo: string) => void
  onClose: () => void
}) {
  const { t } = useLocale()
  const [selected, setSelected] = useState(value)

  return (
    <SheetFrame
      isOpen
      footer={(
        <>
          <Button
            fullWidth
            isDisabled={!selected}
            onPress={() => onChoose(selected)}
          >
            {t('merchantArticles.photoSheet.use')}
          </Button>
          <Button fullWidth variant="tertiary" onPress={onClose}>
            {t('merchantContent.back')}
          </Button>
        </>
      )}
      title={t('merchantArticles.photoSheet.title')}
      onClose={onClose}
    >
      <InfoNote text={t('merchantArticles.photoSheet.note')} />
      <ul className="grid grid-cols-3 gap-2">
        {libraryPhotos.map((slug) => {
          const isSelected = slug === selected

          return (
            <li key={slug}>
              <button
                aria-label={readable(slug)}
                aria-pressed={isSelected}
                className={`relative block w-full overflow-hidden rounded-xl outline-none focus-visible:focus-ring ${
                  isSelected ? 'ring-2 ring-foreground ring-offset-2' : ''
                }`}
                type="button"
                onClick={() => setSelected(slug)}
              >
                <Media alt="" className="aspect-square" photo={slug} />
                {isSelected && (
                  <SelectedIcon
                    aria-hidden
                    className="absolute end-1.5 top-1.5 rounded-full bg-surface text-foreground"
                    size={22}
                    weight="Filled"
                  />
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </SheetFrame>
  )
}

/** A recording from the shop's audio library (prototype stand-in for an upload; R17). */
export function AudioSheet({
  value,
  onChoose,
  onClose,
}: {
  value: string
  onChoose: (audio: string) => void
  onClose: () => void
}) {
  const { t } = useLocale()
  const [selected, setSelected] = useState(value || libraryAudio[0] || '')

  return (
    <SheetFrame
      isOpen
      footer={(
        <>
          <Button
            fullWidth
            isDisabled={!selected}
            onPress={() => onChoose(selected)}
          >
            {t('merchantArticles.audioSheet.use')}
          </Button>
          <Button fullWidth variant="tertiary" onPress={onClose}>
            {t('merchantContent.back')}
          </Button>
        </>
      )}
      title={t('merchantArticles.audioSheet.title')}
      onClose={onClose}
    >
      <InfoNote text={t('merchantArticles.audioSheet.note')} />
      <RadioGroup value={selected} onChange={setSelected}>
        <Label className="sr-only">
          {t('merchantArticles.audioSheet.title')}
        </Label>
        {libraryAudio.map(name => (
          <Radio key={name} className={choiceCard} value={name}>
            <Radio.Content>
              <Radio.Control>
                <Radio.Indicator />
              </Radio.Control>
              {`${name}.mp3`}
            </Radio.Content>
          </Radio>
        ))}
      </RadioGroup>
    </SheetFrame>
  )
}
