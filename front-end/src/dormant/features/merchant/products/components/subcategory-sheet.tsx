import type { LocalizedText, Subcategory } from '@sk/domain/catalog'

import { Button, FieldError, Input, Label, TextField } from '@heroui/react'
import { useState } from 'react'

import { SheetFrame } from '@/components/sheet-frame'
import { useLocale } from '@/contexts/locale-context'

/**
 * M26 add or rename a sub-category in the M08 sheet frame: its name in English and German, at
 * least one of them (R02: a text in one language is enough to publish). Errors show after
 * the first save attempt.
 */
export function SubcategorySheet({
  existing,
  others,
  onSave,
  onClose,
}: {
  /** The sub-category being renamed; absent when adding. */
  existing?: Subcategory
  /** The names already taken in this category (not this one), to refuse a duplicate. */
  others: LocalizedText[]
  onSave: (name: LocalizedText) => void
  onClose: () => void
}) {
  const { t } = useLocale()
  const [en, setEn] = useState(existing?.name.en ?? '')
  const [de, setDe] = useState(existing?.name.de ?? '')
  const [tried, setTried] = useState(false)

  const clean = (value: string) => value.trim().toLocaleLowerCase()
  const taken = (lang: 'en' | 'de', value: string) =>
    !!clean(value) && others.some(o => clean(o[lang] ?? '') === clean(value))
  const errors = {
    any: en.trim() || de.trim() ? undefined : t('categories.sheet.nameError'),
    en: taken('en', en) ? t('categories.sheet.taken') : undefined,
    de: taken('de', de) ? t('categories.sheet.taken') : undefined,
  }
  const isValid = !errors.any && !errors.en && !errors.de

  const save = () => {
    setTried(true)
    if (!isValid)
      return
    onSave({
      ...(en.trim() && { en: en.trim() }),
      ...(de.trim() && { de: de.trim() }),
    })
  }

  return (
    <SheetFrame
      isOpen
      footer={(
        <>
          <Button fullWidth onPress={save}>
            {t(
              existing ? 'categories.sheet.saveEdit' : 'categories.sheet.save',
            )}
          </Button>
          <Button fullWidth variant="tertiary" onPress={onClose}>
            {t('merchantOrder.sheet.back')}
          </Button>
        </>
      )}
      title={t(
        existing ? 'categories.sheet.titleEdit' : 'categories.sheet.title',
      )}
      onClose={onClose}
    >
      <TextField
        fullWidth
        isInvalid={tried && !!(errors.any || errors.en)}
        value={en}
        onChange={setEn}
      >
        <Label className="text-heading">{t('categories.sheet.nameEn')}</Label>
        <Input placeholder={t('categories.sheet.placeholderEn')} />
        <FieldError>{errors.any ?? errors.en}</FieldError>
      </TextField>
      <TextField
        fullWidth
        isInvalid={tried && !!errors.de}
        value={de}
        onChange={setDe}
      >
        <Label className="text-heading">{t('categories.sheet.nameDe')}</Label>
        <Input placeholder={t('categories.sheet.placeholderDe')} />
        <FieldError>{errors.de}</FieldError>
      </TextField>
    </SheetFrame>
  )
}
