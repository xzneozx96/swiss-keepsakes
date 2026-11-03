import type { Language } from '@sk/domain/shared'
import type { OptionsDraftState } from '../hooks/use-options-draft'
import type { OptionDraft } from '../lib/option-rules'

import { Button, ComboBox, Input, Label, ListBox, TextField } from '@heroui/react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { OPTION_NAME_MAX, refusalText } from '../lib/option-rules'
import { NotesAt, QuietNote } from './option-bits'
import { AddValue, ValueList } from './option-values'

/** The option's name as a field with the suggestions under it, the names the shop's other keepsakes use; any other name can be typed (HeroUI ComboBox). With no suggestion there is no list. */
function NameField({ draft, option, language, focusOnMount, suggestions }: { draft: OptionsDraftState, option: OptionDraft, language: Language, focusOnMount: boolean, suggestions: string[] }) {
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
      {/* German has the English layout: the same full-width field, with the English name as placeholder and under it. */}
      <div className="flex min-w-0 flex-col">
        {suggestions.length === 0
          ? (
              // No other keepsake has an option name to offer: a plain field. ComboBox.InputGroup needs its Trigger as the
              // last child, and without one it hands its slot props to the Input, which React warns about.
              <TextField fullWidth className="min-w-0 flex-1" value={option.name[language]} onChange={set}>
                <Label>{t(`keepsakes.options.name.${language}`)}</Label>
                <Input ref={inputRef} lang={language} maxLength={OPTION_NAME_MAX} placeholder={language === 'de' && option.name.en.trim() ? option.name.en : t('keepsakes.options.name.placeholder')} />
              </TextField>
            )
          : (
              <ComboBox
                allowsCustomValue
                fullWidth
                className="min-w-0 flex-1"
                inputValue={option.name[language]}
                menuTrigger="focus"
                onInputChange={set}
                onSelectionChange={key => key !== null && set(String(key))}
              >
                <Label>{t(`keepsakes.options.name.${language}`)}</Label>
                <ComboBox.InputGroup>
                  <Input ref={inputRef} lang={language} maxLength={OPTION_NAME_MAX} placeholder={language === 'de' && option.name.en.trim() ? option.name.en : t('keepsakes.options.name.placeholder')} />
                  <ComboBox.Trigger />
                </ComboBox.InputGroup>
                <ComboBox.Popover>
                  <ListBox>
                    {suggestions.map(suggestion => (
                      <ListBox.Item key={suggestion} id={suggestion} textValue={suggestion}>
                        {suggestion}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </ComboBox.Popover>
              </ComboBox>
            )}
      </div>
      {language === 'de' && option.name.en.trim() && (
        <p className="text-xs text-muted">
          {t('keepsakes.options.english')}
          {' '}
          <span lang="en">{option.name.en}</span>
        </p>
      )}
      <NotesAt at={option.ref} draft={draft} only="problems" />
    </div>
  )
}

/**
 * One option that is open, inline in the Options block: its name with suggestions, its values in order with a field to add
 * another. Done checks it and folds it to one row; Delete asks first. The editor's own EN/DE
 * switch decides the version, so there are no tabs here.
 */
export function OptionEditor({ draft, option, language, autoFocusName, suggestions, isPending, failure, canCancel, onDone, onCancel, onDelete }: {
  draft: OptionsDraftState
  option: OptionDraft
  language: Language
  autoFocusName: boolean
  /** The option names that the shop's other keepsakes use, in `language`. */
  suggestions: string[]
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
  const count = draft.problems.length
  // What the API refused about a new variant (a code in use, a combination that is taken) belongs to no field: it is said here.
  const own = new Set([option.ref, ...option.values.map(value => value.ref)])
  const elsewhere = draft.problems.filter(problem => !own.has(problem.at))

  return (
    <div className="flex min-w-0 flex-col gap-5 rounded-2xl border border-separator p-3 lg:p-4" data-testid="option-editor">
      <NameField focusOnMount={autoFocusName} draft={draft} language={language} option={option} suggestions={suggestions} />

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-medium">{t('keepsakes.options.values')}</span>
          <span className="text-xs text-muted">{t('keepsakes.options.valuesHint')}</span>
        </div>
        {option.values.length > 0 && <ValueList draft={draft} focused={focused} lang={language} option={option} onFocused={clearFocus} />}
        {language === 'en'
          ? <AddValue draft={draft} option={option} onAdded={setFocused} />
          : option.values.length === 0 && <p className="text-xs text-pretty text-muted">{t('keepsakes.options.germanValues.empty')}</p>}
      </div>

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
