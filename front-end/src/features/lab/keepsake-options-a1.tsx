import type { Lang, OptionDraft } from './keepsake-options-data'
import type { OptionsDraft } from './keepsake-options-state'
/** A1: one box to type values into, the rows below are the order; one language switch for the whole block. Edits inline in the Options step. */
import type { LanguageStatus } from '@/components/language-version-switch'

import { Button, Description, Input, Label, TextField } from '@heroui/react'
import { useState } from 'react'

import { CheckIcon, OptionIcon, PlusIcon, TrashIcon } from '@/components/icons'
import { LanguageVersionSwitch } from '@/components/language-version-switch'
import { Block } from '@/features/places/components/fields'
import { AssignVariants, DraftBar, ProblemLines, Reorder, SwatchPicker } from './keepsake-options-parts'
import { labelOf, plural, splitValues } from './keepsake-options-rules'

const ANY_BREAK = /[,;\n]/
const BREAK_PARTS = /([,;\n])/
const LEADING_BREAK = /^[,;\n]/

const LANGUAGES = [{ id: 'en', label: 'English', short: 'EN' }, { id: 'de', label: 'Deutsch', short: 'DE' }] as const

/** How much German is missing: the option names and every value. */
function germanGaps(options: OptionDraft[]) {
  const texts = options.flatMap(option => [option.name, ...option.values.map(value => value.label)])

  return texts.filter(text => text.en.trim() && !text.de.trim()).length
}

/** The values box: Enter or a comma makes a value, a pasted list makes several. A duplicate is refused where you typed it. */
function ValueEntry({ draft, option }: { draft: OptionsDraft, option: OptionDraft }) {
  const [text, setText] = useState('')
  const [refused, setRefused] = useState<string[]>([])

  const commit = (words: string[]) => {
    setRefused(draft.addValues(option.ref, words))
  }

  return (
    <TextField
      fullWidth
      value={text}
      onChange={(next) => {
        if (ANY_BREAK.test(next)) {
          const parts = next.split(BREAK_PARTS)
          const rest = parts.pop() ?? ''

          commit(splitValues(parts.join('')))
          setText(rest.replace(LEADING_BREAK, ''))

          return
        }
        setText(next)
      }}
    >
      <Label className="text-xs text-muted">Add values</Label>
      <Input
        maxLength={80}
        placeholder="Type a value, then Enter"
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            if (text.trim()) {
              commit(splitValues(text))
              setText('')
            }
          }
        }}
      />
      <Description>Or paste a list: Small, Medium, Large.</Description>
      {refused.length > 0 && <p className="text-sm text-danger" role="alert">{`${refused.join(', ')} ${refused.length === 1 ? 'is' : 'are'} already a value of ${labelOf(option.name) || 'this option'}.`}</p>}
    </TextField>
  )
}

function OptionSection({ draft, option, lang }: { draft: OptionsDraft, option: OptionDraft, lang: Lang }) {
  const german = lang === 'de'
  const colours = option.values.some(value => value.swatch !== null)
  const optionName = labelOf(option.name) || 'new option'

  return (
    <section aria-label={optionName} className="flex flex-col gap-3 border-t border-separator pt-4 first:border-t-0 first:pt-0" data-option={option.ref}>
      <div className="flex items-end gap-2">
        <TextField fullWidth value={option.name[lang]} onChange={name => draft.patchName(option.ref, { ...option.name, [lang]: name })}>
          <Label>{german ? 'Option name in German' : 'Option name'}</Label>
          <Input lang={lang} maxLength={60} placeholder={german ? labelOf(option.name, 'en') || 'Grösse, Motiv, Farbe…' : 'Size, Theme, Colour…'} />
        </TextField>
        <Button aria-pressed={colours} className="shrink-0 max-lg:h-11" size="md" variant={colours ? 'secondary' : 'tertiary'} onPress={() => draft.setSwatches(option.ref, !colours)}>
          {colours && <CheckIcon aria-hidden size={14} />}
          Colours
        </Button>
        <Button isIconOnly aria-label={`Delete the option ${optionName}`} className="shrink-0 max-lg:size-11" variant="danger-soft" onPress={() => draft.removeOption(option.ref)}>
          <TrashIcon aria-hidden size={16} />
        </Button>
      </div>
      <ProblemLines at={option.ref} draft={draft} />
      {german
        ? <p className="text-sm text-pretty text-muted">New values are added in English. Here you give each one a German text; left empty, German readers see the English.</p>
        : <ValueEntry draft={draft} option={option} />}
      {option.values.length > 0 && (
        <Reorder
          items={option.values}
          label={`Values of ${optionName} in the order guests see them`}
          nameOf={value => labelOf(value.label, lang) || 'value'}
          row={(value, _index, grip) => {
            const english = labelOf(value.label, 'en')

            return (
              <div className="flex w-full min-w-0 flex-col py-0.5">
                <div className="flex min-w-0 items-center gap-1">
                  {grip}
                  {colours && <SwatchPicker name={english || 'value'} value={value.swatch} onChange={swatch => draft.patchValue(option.ref, value.ref, { swatch })} />}
                  {german && <span className="hidden w-28 shrink-0 truncate text-sm text-muted sm:block">{english}</span>}
                  <TextField fullWidth aria-label={german ? `German text of ${english}` : `Value ${english || 'new value'}`} value={value.label[lang]} onChange={text => draft.patchValue(option.ref, value.ref, { label: { ...value.label, [lang]: text } })}>
                    <Input lang={lang} maxLength={80} placeholder={german ? english : ''} variant="secondary" />
                  </TextField>
                  <Button isIconOnly aria-label={`Delete the value ${english || 'new value'}`} className="shrink-0 text-danger max-lg:size-11" size="sm" variant="tertiary" onPress={() => draft.removeValue(option.ref, value.ref)}>
                    <TrashIcon aria-hidden size={16} />
                  </Button>
                </div>
                <div className="ps-11 empty:hidden">
                  <ProblemLines at={value.ref} draft={draft} />
                </div>
              </div>
            )
          }}
          onMove={(from, to) => draft.moveValue(option.ref, from, to)}
        />
      )}
      {draft.needValues.some(o => o.ref === option.ref) && <AssignVariants draft={draft} option={option} />}
    </section>
  )
}

export function OptionsA1({ draft }: { draft: OptionsDraft }) {
  const [lang, setLang] = useState<Lang>('en')
  const gaps = germanGaps(draft.options)
  const status: Record<Lang, LanguageStatus> = {
    en: { text: draft.options.length === 0 ? 'Nothing yet' : 'Texts written', tone: draft.options.length === 0 ? 'muted' : 'success' },
    de: gaps === 0 ? { text: 'Everything has a German text', tone: 'success' } : { text: `${plural(gaps, 'German text')} missing, English shows instead`, tone: 'warning' },
  }

  return (
    <Block hint="What guests choose between. Every variant has one value of each option." icon={OptionIcon} title="Options">
      <LanguageVersionSwitch label="Option language" languages={LANGUAGES} selected={lang} status={status} onChange={setLang} />
      {draft.options.length === 0 && <p className="text-sm text-pretty text-muted">No options: this keepsake is sold as one variant.</p>}
      {draft.options.map(option => <OptionSection key={option.ref} draft={draft} lang={lang} option={option} />)}
      <Button className="self-start max-lg:h-11" variant="secondary" onPress={() => { setLang('en'); draft.addOption() }}>
        <PlusIcon aria-hidden size={16} />
        Add option
      </Button>
      <DraftBar draft={draft} />
    </Block>
  )
}
