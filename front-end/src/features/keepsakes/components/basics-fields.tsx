import type { Language } from '@sk/domain/shared'
import type { KeepsakeText, LanguageState } from '../lib/keepsake-rules'

import { FieldError, Input, Label, Skeleton, TextField } from '@heroui/react'
import { descriptionLength } from '@sk/domain/content'
import { lazy, Suspense } from 'react'

import { LanguageVersionSwitch } from '@/components/language-version-switch'
import { useLocale } from '@/contexts/locale-context'
import { fullLanguages, hasDescription, LANGUAGES, languageState, NAME_MAX, TEXT_MAX } from '../lib/keepsake-rules'

// The description's editor is the story editor with the text kit. It loads here, never from a route (performance rule 9).
const DescriptionEditor = lazy(() => import('@/features/merchant/products/components/story-editor'))

/** The loading state has the editor's shape: the label, a toolbar of small buttons, and lines of text. */
function EditorSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-2">
      <Skeleton className="h-4 w-40 rounded-lg" />
      <div className="flex gap-1">
        {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="size-8 rounded-lg" />)}
      </div>
      <Skeleton className="h-4 w-full rounded-lg" />
      <Skeleton className="h-4 w-5/6 rounded-lg" />
      <Skeleton className="h-4 w-2/3 rounded-lg" />
    </div>
  )
}

const tone = { 'complete': 'success', 'missing-text': 'warning', 'missing-name': 'warning', 'not-written': 'muted' } as const

const stateKey = {
  'complete': 'keepsakes.state.complete',
  'missing-text': 'keepsakes.state.missingText',
  'missing-name': 'keepsakes.state.missingName',
  'not-written': 'keepsakes.state.notWritten',
} as const satisfies Record<LanguageState, string>

/**
 * The shared language switch with each language's completeness; its tabs are labelled as the languages are named.
 * `missingOptionNames` is how many option and value names a language still lacks: a language that is otherwise complete
 * says so.
 */
export function KeepsakeLanguageSwitch({ value, selected, onChange, missingOptionNames, compact = false }: { value: KeepsakeText, selected: Language, onChange: (language: Language) => void, missingOptionNames?: Record<Language, number>, compact?: boolean }) {
  const { t } = useLocale()
  const status = (language: Language) => {
    const state = languageState(value, language)

    if (state === 'complete' && (missingOptionNames?.[language] ?? 0) > 0)
      return { text: t('keepsakes.state.missingOptions'), tone: 'warning' as const }

    return { text: t(stateKey[state]), tone: tone[state] }
  }

  return (
    <LanguageVersionSwitch
      compact={compact}
      label={t('keepsakes.language.switch')}
      languages={LANGUAGES.map(id => ({ id, label: t(`keepsakes.language.${id}`), short: id.toUpperCase() }))}
      selected={selected}
      status={{ en: status('en'), de: status('de') }}
      onChange={onChange}
    />
  )
}

/**
 * Name and text for the language the editor's switch has chosen (the Details step and the Name and text card).
 * `showErrors` is on after a blocked publish or Next: with no full language, the empty fields say what to add.
 */
export function BasicsFields({ value, language, onChange, showErrors, nameOnly = false }: {
  value: KeepsakeText
  language: Language
  onChange: (next: KeepsakeText) => void
  showErrors: boolean
  /** The create flow needs a name only; the text is not required to make a draft. */
  nameOnly?: boolean
}) {
  const { t } = useLocale()
  const { name, text } = value
  const invalid = showErrors && (nameOnly ? !LANGUAGES.some(l => name[l].trim()) : fullLanguages(value).length === 0)
  const label = t(`keepsakes.language.${language}`)
  const count = descriptionLength(text[language])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-pretty text-muted">{t('keepsakes.basics.hint')}</p>
      <TextField fullWidth isRequired isInvalid={invalid && !name[language].trim()} value={name[language]} onChange={next => onChange({ ...value, name: { ...name, [language]: next } })}>
        <Label>{t('keepsakes.basics.name', { language: label })}</Label>
        <Input lang={language} maxLength={NAME_MAX} placeholder={t(`keepsakes.basics.name.placeholder.${language}`)} />
        <FieldError>{t(nameOnly ? 'keepsakes.create.nameRequired' : 'keepsakes.basics.nameRequired')}</FieldError>
      </TextField>
      <div className="flex flex-col gap-1.5">
        <Suspense fallback={<EditorSkeleton />}>
          {/* One editor for each language: it starts from the text of the language and keeps its own caret. */}
          <DescriptionEditor
            key={language}
            kit="text"
            label={t('keepsakes.basics.text', { language: label })}
            lang={language}
            value={text[language]}
            onChange={doc => onChange({ ...value, text: { ...text, [language]: doc } })}
          />
        </Suspense>
        <p className={`text-xs ${count > TEXT_MAX ? 'text-danger' : 'text-muted'}`}>
          {t('keepsakes.basics.textHint', { count, max: TEXT_MAX })}
        </p>
        {count > TEXT_MAX && <p className="text-xs text-danger" role="alert">{t('keepsakes.basics.textTooLong', { max: TEXT_MAX })}</p>}
        {invalid && !nameOnly && !hasDescription(text[language]) && <FieldError className="data-[visible=true]:block" data-visible>{t('keepsakes.basics.textRequired')}</FieldError>}
      </div>
    </div>
  )
}
