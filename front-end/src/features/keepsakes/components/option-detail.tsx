import type { OptionsDraftState } from '../hooks/use-options-draft'
import type { OptionDraft } from '../lib/option-rules'

import { Input, Label, Switch, TextField } from '@heroui/react'
import { useEffect, useRef, useState } from 'react'

import { LanguageVersionSwitch } from '@/components/language-version-switch'
import { useLocale } from '@/contexts/locale-context'
import { OPTION_NAME_MAX } from '../lib/option-rules'
import { AssignPanel } from './option-assign'
import { NotesAt } from './option-bits'
import { AddValue, ValueList } from './option-values'

type Lang = 'en' | 'de'

const LANGS: Lang[] = ['en', 'de']

/** The names an option has in one language: its own and every value that has a name in either language. */
function namesIn(option: OptionDraft, lang: Lang) {
  const texts = [option.name, ...option.values.map(value => value.label).filter(label => label.en.trim() || label.de.trim())]

  return { total: texts.length, missing: texts.filter(text => !text[lang].trim()).length }
}

/**
 * One option, whole: the language switch (English unless the option is named in German only), its name and its values in order (the labels in the chosen language), a value on
 * every variant when it is new, and the colour swatches. The laptop shows it beside the list, the phone in the sheet. Delete
 * lives in the action row below (laptop) or the sheet footer (phone).
 */
export function OptionDetail({ draft, option, autoFocusName = false }: { draft: OptionsDraftState, option: OptionDraft, autoFocusName?: boolean }) {
  const { t } = useLocale()
  const nameRef = useRef<HTMLInputElement>(null)
  const [lang, setLang] = useState<Lang>(() => (option.name.en.trim() || !option.name.de.trim() ? 'en' : 'de'))
  const swatches = draft.swatchesOn(option)
  const status = (id: Lang) => {
    const { total, missing } = namesIn(option, id)

    if (missing === 0)
      return { text: t('keepsakes.options.lang.ready'), tone: 'success' as const }
    if (id === 'de' && missing === total)
      return { text: t('keepsakes.options.lang.notWritten'), tone: 'muted' as const }

    return { text: t(missing === 1 ? 'keepsakes.options.lang.missing.one' : 'keepsakes.options.lang.missing.other', { count: missing }), tone: 'warning' as const }
  }

  // A new option opens on its name field. Only the first render asks: later typing must not pull the focus back.
  useEffect(() => {
    if (autoFocusName)
      nameRef.current?.focus()
  }, [autoFocusName])

  return (
    <div className="flex min-w-0 flex-col gap-6" data-testid="option-detail">
      <LanguageVersionSwitch
        label={t('keepsakes.options.lang.switch')}
        languages={LANGS.map(id => ({ id, label: t(`keepsakes.options.lang.${id}`), short: id.toUpperCase() }))}
        selected={lang}
        status={{ en: status('en'), de: status('de') }}
        onChange={setLang}
      />

      <div className="flex flex-col gap-1">
        <TextField fullWidth value={option.name[lang]} onChange={text => draft.patchName(option.ref, { ...option.name, [lang]: text })}>
          <Label>{t(`keepsakes.options.name.${lang}`)}</Label>
          <Input ref={nameRef} lang={lang} maxLength={OPTION_NAME_MAX} placeholder={lang === 'de' && option.name.en.trim() ? option.name.en : t('keepsakes.options.name.placeholder')} />
        </TextField>
        {lang === 'de' && <p className="text-xs text-pretty text-muted">{t('keepsakes.options.german.hint')}</p>}
        <NotesAt at={option.ref} draft={draft} only="problems" />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-medium">{t('keepsakes.options.values')}</span>
          <span className="text-xs text-muted">{t('keepsakes.options.valuesHint')}</span>
        </div>
        <AddValue key={lang} draft={draft} lang={lang} option={option} />
        {option.values.length > 0 && <ValueList draft={draft} lang={lang} option={option} />}
      </div>

      {draft.needValues.some(needing => needing.ref === option.ref) && <AssignPanel draft={draft} option={option} />}

      <Switch className="min-h-11 lg:min-h-9" isSelected={swatches} onChange={on => draft.setSwatches(option.ref, on)}>
        <Switch.Content className="items-center">
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          <Label className="text-sm">{t('keepsakes.options.swatches')}</Label>
        </Switch.Content>
      </Switch>
    </div>
  )
}
