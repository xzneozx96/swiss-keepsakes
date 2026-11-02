import type { Language } from '@sk/domain/shared'
import type { OptionsDraftState } from '../hooks/use-options-draft'
import type { OptionDraft } from '../lib/option-rules'

import { Button, ComboBox, Input, Label, ListBox, Switch } from '@heroui/react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { OPTION_NAME_MAX, refusalText } from '../lib/option-rules'
import { NotesAt, QuietNote } from './option-bits'
import { AddValue, ValueList } from './option-values'

/** The names the merchant is offered for an option, in both languages: the name is typed or picked in the version that is open. */
const SUGGESTIONS = [
  { id: 'size', en: 'Size', de: 'Grösse' },
  { id: 'colour', en: 'Colour', de: 'Farbe' },
  { id: 'theme', en: 'Theme', de: 'Motiv' },
  { id: 'material', en: 'Material', de: 'Material' },
] as const

/** The option's name as a field with the suggestions under it; any other name can be typed (HeroUI ComboBox). */
function NameField({ draft, option, language, focusOnMount }: { draft: OptionsDraftState, option: OptionDraft, language: Language, focusOnMount: boolean }) {
  const { t } = useLocale()
  const inputRef = useRef<HTMLInputElement>(null)
  const set = (text: string) => draft.patchName(option.ref, { ...option.name, [language]: text.slice(0, OPTION_NAME_MAX) })

  // A new option opens on its name. Only the first render asks: later typing must not pull the focus back.
  useEffect(() => {
    if (focusOnMount)
      inputRef.current?.focus()
  }, [focusOnMount])

  return (
    <div className="flex flex-col gap-1">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end">
        {language === 'de' && (
          // The same name as on the English version: its English name beside the field for its German one.
          <div className="flex min-w-0 flex-col gap-1 sm:w-2/5">
            <span className="text-sm font-medium">{t('keepsakes.options.name.en')}</span>
            <span className="flex min-h-9 items-center truncate text-muted" lang="en">{option.name.en || '—'}</span>
          </div>
        )}
        <ComboBox
          allowsCustomValue
          fullWidth
          className="min-w-0 flex-1"
          inputValue={option.name[language]}
          menuTrigger="focus"
          onInputChange={set}
          onSelectionChange={key => key !== null && set(SUGGESTIONS.find(suggestion => suggestion.id === key)?.[language] ?? '')}
        >
          <Label>{t(`keepsakes.options.name.${language}`)}</Label>
          <ComboBox.InputGroup>
            <Input ref={inputRef} lang={language} maxLength={OPTION_NAME_MAX} placeholder={language === 'de' && option.name.en.trim() ? option.name.en : t('keepsakes.options.name.placeholder')} />
            <ComboBox.Trigger />
          </ComboBox.InputGroup>
          <ComboBox.Popover>
            <ListBox>
              {SUGGESTIONS.map(suggestion => (
                <ListBox.Item key={suggestion.id} id={suggestion.id} textValue={suggestion[language]}>
                  {suggestion[language]}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </ComboBox.Popover>
        </ComboBox>
      </div>
      <NotesAt at={option.ref} draft={draft} only="problems" />
    </div>
  )
}

/**
 * One option that is open, inline in the Options block: its name with suggestions, its values in order with a field to add
 * another, and the colour swatches. Done checks it and folds it to one row; Delete asks first. The editor's own EN/DE
 * switch decides the version, so there are no tabs here.
 */
export function OptionEditor({ draft, option, language, autoFocusName, isPending, failure, canCancel, onDone, onCancel, onDelete }: {
  draft: OptionsDraftState
  option: OptionDraft
  language: Language
  autoFocusName: boolean
  isPending: boolean
  failure: string | undefined
  /** Cancel puts back what the option was when it opened; a new keepsake's first option has nothing to go back to. */
  canCancel: boolean
  onDone: () => void
  onCancel: () => void
  onDelete: () => void
}) {
  const { t } = useLocale()
  const [focused, setFocused] = useState<string>()
  const clearFocus = useCallback(() => setFocused(undefined), [])
  const swatches = draft.swatchesOn(option)
  const count = draft.problems.length
  // What the API refused about a new variant (a code in use, a combination that is taken) belongs to no field: it is said here.
  const own = new Set([option.ref, ...option.values.map(value => value.ref)])
  const elsewhere = draft.problems.filter(problem => !own.has(problem.at))

  return (
    <div className="flex min-w-0 flex-col gap-5 rounded-2xl border border-separator p-3 lg:p-4" data-testid="option-editor">
      <NameField focusOnMount={autoFocusName} draft={draft} language={language} option={option} />

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-medium">{t('keepsakes.options.values')}</span>
          <span className="text-xs text-muted">{t('keepsakes.options.valuesHint')}</span>
        </div>
        {option.values.length > 0 && <ValueList draft={draft} focused={focused} lang={language} option={option} onFocused={clearFocus} />}
        {language === 'en'
          ? <AddValue draft={draft} option={option} onAdded={setFocused} />
          : <p className="text-xs text-pretty text-muted">{t(option.values.length > 0 ? 'keepsakes.options.germanValues.hint' : 'keepsakes.options.germanValues.empty')}</p>}
      </div>

      <Switch className="min-h-11 lg:min-h-9" isSelected={swatches} onChange={on => draft.setSwatches(option.ref, on)}>
        <Switch.Content className="items-center">
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          <Label className="text-sm">{t('keepsakes.options.swatches')}</Label>
        </Switch.Content>
      </Switch>

      <NotesAt at={option.ref} draft={draft} only="refusal" />
      {draft.tried && count > 0 && <p className="text-sm text-pretty text-danger" role="alert">{t(count === 1 ? 'keepsakes.options.fix.one' : 'keepsakes.options.fix.other', { count })}</p>}
      {elsewhere.map(problem => <QuietNote key={`${problem.code}:${problem.at}`}>{refusalText(t, problem)}</QuietNote>)}
      {failure && <QuietNote>{failure}</QuietNote>}
      <div className="flex flex-wrap items-center gap-2">
        <Button className="me-auto max-lg:h-11" isDisabled={isPending} variant="danger-soft" onPress={onDelete}>{t('keepsakes.options.deleteOption')}</Button>
        {canCancel && <Button className="max-lg:h-11" isDisabled={isPending} variant="tertiary" onPress={onCancel}>{t('keepsakes.variant.cancel')}</Button>}
        <Button className="max-lg:h-11" isPending={isPending} onPress={onDone}>{t('keepsakes.options.done')}</Button>
      </div>
    </div>
  )
}
