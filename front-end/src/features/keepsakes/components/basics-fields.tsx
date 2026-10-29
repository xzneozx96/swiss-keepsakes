import type { Language } from '@sk/domain/shared'
import type { KeepsakeText, LanguageState } from '../lib/keepsake-rules'

import { Description, FieldError, Input, Label, TextArea, TextField } from '@heroui/react'
import { useState } from 'react'

import { LanguageVersionSwitch } from '@/components/language-version-switch'
import { useLocale } from '@/contexts/locale-context'
import { fullLanguages, LANGUAGES, languageState, NAME_MAX, TEXT_MAX } from '../lib/keepsake-rules'

const tone = { 'complete': 'success', 'missing-text': 'warning', 'missing-name': 'warning', 'not-written': 'muted' } as const

const stateKey = {
  'complete': 'keepsakes.state.complete',
  'missing-text': 'keepsakes.state.missingText',
  'missing-name': 'keepsakes.state.missingName',
  'not-written': 'keepsakes.state.notWritten',
} as const satisfies Record<LanguageState, string>

/** The shared language switch with each language's completeness; its tabs are labelled as the languages are named. */
export function KeepsakeLanguageSwitch({ value, selected, onChange }: { value: KeepsakeText, selected: Language, onChange: (language: Language) => void }) {
  const { t } = useLocale()
  const status = (language: Language) => {
    const state = languageState(value, language)

    return { text: t(stateKey[state]), tone: tone[state] }
  }

  return (
    <LanguageVersionSwitch
      label={t('keepsakes.language.switch')}
      languages={LANGUAGES.map(id => ({ id, label: t(`keepsakes.language.${id}`), short: id.toUpperCase() }))}
      selected={selected}
      status={{ en: status('en'), de: status('de') }}
      onChange={onChange}
    />
  )
}

/**
 * Name and text for the chosen language (the Details step and the Name and text card). `showErrors` is on after a
 * blocked publish or Next: with no full language, the empty fields say what to add.
 */
export function BasicsFields({ value, onChange, showErrors, nameOnly = false }: {
  value: KeepsakeText
  onChange: (next: KeepsakeText) => void
  showErrors: boolean
  /** The create flow needs a name only; the text is not required to make a draft. */
  nameOnly?: boolean
}) {
  const { t } = useLocale()
  const [language, setLanguage] = useState<Language>('en')
  const { name, text } = value
  const invalid = showErrors && (nameOnly ? !LANGUAGES.some(l => name[l].trim()) : fullLanguages(value).length === 0)
  const label = t(`keepsakes.language.${language}`)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <KeepsakeLanguageSwitch selected={language} value={value} onChange={setLanguage} />
        <p className="text-xs text-pretty text-muted">{t('keepsakes.basics.hint')}</p>
      </div>
      <TextField fullWidth isRequired isInvalid={invalid && !name[language].trim()} value={name[language]} onChange={next => onChange({ ...value, name: { ...name, [language]: next } })}>
        <Label>{t('keepsakes.basics.name', { language: label })}</Label>
        <Input lang={language} maxLength={NAME_MAX} placeholder={t(`keepsakes.basics.name.placeholder.${language}`)} />
        <FieldError>{t(nameOnly ? 'keepsakes.create.nameRequired' : 'keepsakes.basics.nameRequired')}</FieldError>
      </TextField>
      <TextField fullWidth isRequired={!nameOnly} isInvalid={invalid && !nameOnly && !text[language].trim()} value={text[language]} onChange={next => onChange({ ...value, text: { ...text, [language]: next } })}>
        <Label>{t('keepsakes.basics.text', { language: label })}</Label>
        <TextArea lang={language} maxLength={TEXT_MAX} rows={6} />
        <Description>{t('keepsakes.basics.textHint', { count: text[language].length, max: TEXT_MAX })}</Description>
        <FieldError>{t('keepsakes.basics.textRequired')}</FieldError>
      </TextField>
    </div>
  )
}
