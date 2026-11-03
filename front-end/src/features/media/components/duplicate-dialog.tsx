import type { MediaMatch } from '@sk/api-contract'
import type { Duplicate } from '../lib/duplicates'

import { Button, Radio, RadioGroup } from '@heroui/react'
import { useState } from 'react'

import { choiceCard } from '@/components/choice-card'
import { FilePdfIcon, MusicIcon } from '@/components/icons'
import { SheetFrame } from '@/components/sheet-frame'
import { useLocale } from '@/contexts/locale-context'

export type DuplicateChoice = 'use' | 'copy'

/** The smallest copy that is wide enough for a 44 px picture, else the original. */
function MatchThumb({ media }: { media: MediaMatch }) {
  const variant = media.variants.find(copy => copy.width >= 160) ?? media.variants.at(-1)
  const src = media.kind === 'image' ? variant?.url ?? media.publicUrl ?? undefined : undefined
  const Icon = media.kind === 'audio' ? MusicIcon : FilePdfIcon

  return (
    <span className="relative block size-11 shrink-0 overflow-hidden rounded-xl bg-surface-secondary">
      {src && <img alt="" className="absolute inset-0 size-full object-cover" decoding="async" height={44} src={src} width={44} />}
      {media.kind !== 'image' && (
        <span className="absolute inset-0 flex items-center justify-center text-foreground/70">
          <Icon aria-hidden size={20} />
        </span>
      )}
    </span>
  )
}

/**
 * Before an upload that holds files the library already has (by content): one sheet with each of them, a picture and
 * its library name, and a choice per file. "Use the existing photo" is the default and uploads nothing; "Upload a copy"
 * uploads the bytes again. Two or more files also get one choice for all. Dismissing the sheet cancels the whole pick.
 * Mount it only while it asks: it starts from the default each time.
 */
export function DuplicateDialog({ duplicates, onDone, onCancel }: {
  duplicates: Duplicate[]
  /** One choice per duplicate, in the order given. */
  onDone: (choices: DuplicateChoice[]) => void
  onCancel: () => void
}) {
  const { t } = useLocale()
  const [choices, setChoices] = useState<DuplicateChoice[]>(() => duplicates.map(() => 'use'))
  const many = duplicates.length > 1
  const allPhotos = duplicates.every(({ existing }) => existing.kind === 'image')
  const intro = allPhotos
    ? t(many ? 'media.duplicate.bodyPhotos' : 'media.duplicate.bodyPhotoOne', { count: duplicates.length })
    : t(many ? 'media.duplicate.bodyFiles' : 'media.duplicate.bodyFileOne', { count: duplicates.length })

  return (
    <SheetFrame
      footer={(
        <>
          <Button className="max-lg:min-h-11" onPress={() => onDone(choices)}>{t('media.duplicate.continue')}</Button>
          <Button className="max-lg:min-h-11" variant="tertiary" onPress={onCancel}>{t('media.duplicate.cancel')}</Button>
        </>
      )}
      isOpen
      title={t('media.duplicate.title')}
      onClose={onCancel}
    >
      <p className="text-sm text-muted">{intro}</p>
      {many && (
        <div className="flex flex-wrap gap-2">
          <Button className="max-lg:min-h-11" size="sm" variant="secondary" onPress={() => setChoices(duplicates.map(() => 'use'))}>{t('media.duplicate.allUse')}</Button>
          <Button className="max-lg:min-h-11" size="sm" variant="secondary" onPress={() => setChoices(duplicates.map(() => 'copy'))}>{t('media.duplicate.allCopy')}</Button>
        </div>
      )}
      <ul aria-label={t('media.duplicate.list')} className="flex flex-col gap-4">
        {duplicates.map(({ file, existing }, index) => (
          <li key={`${index}-${existing.id}`} className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <MatchThumb media={existing} />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-semibold">{existing.name}</span>
                {file.name !== existing.name && <span className="truncate text-xs text-muted">{t('media.duplicate.picked', { name: file.name })}</span>}
              </span>
            </div>
            <RadioGroup
              aria-label={t('media.duplicate.choice', { name: existing.name })}
              orientation="horizontal"
              value={choices[index]}
              onChange={value => setChoices(current => current.map((choice, at) => (at === index ? value as DuplicateChoice : choice)))}
            >
              <div className="grid gap-2 sm:grid-cols-2">
                {(['use', 'copy'] as const).map(choice => (
                  <Radio key={choice} className={choiceCard} value={choice}>
                    <Radio.Content>
                      <Radio.Control>
                        <Radio.Indicator />
                      </Radio.Control>
                      {choice === 'copy' ? t('media.duplicate.copy') : t(allPhotos ? 'media.duplicate.usePhoto' : 'media.duplicate.useFile')}
                    </Radio.Content>
                  </Radio>
                ))}
              </div>
            </RadioGroup>
          </li>
        ))}
      </ul>
    </SheetFrame>
  )
}
