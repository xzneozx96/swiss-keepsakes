/**
 * A2: the step lists each option as one flat row; Edit opens the shared sheet with a values table: English and German
 * side by side, a grip, an optional colour, and an empty last row that is how you add (Enter walks down the column).
 */
import type { KeyboardEvent } from 'react'
import type { OptionDraft } from './keepsake-options-data'
import type { OptionsDraft } from './keepsake-options-state'

import { Button, Chip, Input, Label, TextField } from '@heroui/react'
import { useState } from 'react'

import { Block } from '@/components/form-block'
import { CheckIcon, EditIcon, OptionIcon, PlusIcon, TrashIcon } from '@/components/icons'
import { SheetFrame } from '@/components/sheet-frame'
import { Swatch } from '@/features/keepsakes/components/option-parts'
import { AssignVariants, ProblemLines, Reorder, SwatchPicker } from './keepsake-options-parts'
import { labelOf, plural, variantsUsing } from './keepsake-options-rules'

/** Enter moves to the same column of the next row; the empty last row is the next row of the last value. */
function walkDown(event: KeyboardEvent<HTMLInputElement>) {
  if (event.key !== 'Enter')
    return
  event.preventDefault()
  const scope = event.currentTarget.closest('[data-values]')
  const column = event.currentTarget.dataset.col
  const cells = Array.from(scope?.querySelectorAll<HTMLInputElement>(`input[data-col="${column}"]`) ?? [])

  cells[cells.indexOf(event.currentTarget) + 1]?.focus()
}

/** The empty last row. A value is made when you press Enter in it or leave the row with text in it. */
function GhostRow({ draft, option, colours }: { draft: OptionsDraft, option: OptionDraft, colours: boolean }) {
  const [text, setText] = useState({ en: '', de: '' })
  const [refused, setRefused] = useState(false)

  const commit = () => {
    if (!text.en.trim() && !text.de.trim())
      return
    const wasRefused = draft.addValueText(option.ref, { en: text.en.trim(), de: text.de.trim() })

    setRefused(wasRefused)
    if (!wasRefused)
      setText({ en: '', de: '' })
  }

  return (
    <div
      className="flex items-start gap-1"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          commit()
      }}
    >
      <span aria-hidden className="size-11 shrink-0 lg:size-9" />
      {colours && <span aria-hidden className="size-11 shrink-0 lg:size-9" />}
      <div className="grid min-w-0 flex-1 gap-1 sm:grid-cols-2">
        {(['en', 'de'] as const).map(lang => (
          <TextField key={lang} fullWidth aria-label={lang === 'en' ? 'New value in English' : 'New value in German (optional)'} className="flex-row items-center gap-2" value={text[lang]} onChange={next => setText(t => ({ ...t, [lang]: next }))}>
            <span aria-hidden className="w-5 shrink-0 text-xs text-muted sm:hidden">{lang.toUpperCase()}</span>
            <Input
              data-col={lang}
              lang={lang}
              maxLength={80}
              placeholder={lang === 'en' ? 'Add a value' : 'German (optional)'}
              variant="secondary"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  commit()
                  event.preventDefault()
                }
              }}
            />
          </TextField>
        ))}
        {refused && <p className="text-sm text-danger sm:col-span-2" role="alert">{`${text.en || text.de} is already a value of ${labelOf(option.name) || 'this option'}.`}</p>}
      </div>
      <span aria-hidden className="size-11 shrink-0 lg:size-8" />
    </div>
  )
}

function ValuesTable({ draft, option }: { draft: OptionsDraft, option: OptionDraft }) {
  const colours = option.values.some(value => value.swatch !== null)
  const filled = option.values.filter(value => value.label.de.trim()).length

  return (
    <div className="flex flex-col gap-2" data-values="">
      <div className="flex items-center gap-2">
        <h4 className="me-auto text-sm font-semibold">Values</h4>
        <span className="text-xs text-muted tabular-nums">{`German on ${filled} of ${option.values.length}`}</span>
        <Button aria-pressed={colours} size="sm" variant={colours ? 'secondary' : 'tertiary'} onPress={() => draft.setSwatches(option.ref, !colours)}>
          {colours && <CheckIcon aria-hidden size={14} />}
          Colours
        </Button>
      </div>
      <div aria-hidden className="hidden items-center gap-1 text-xs text-muted sm:flex">
        <span className="w-9 shrink-0" />
        {colours && <span className="w-9 shrink-0" />}
        <span className="grid flex-1 grid-cols-2 gap-1">
          <span>English</span>
          <span>German (optional)</span>
        </span>
        <span className="w-8 shrink-0" />
      </div>
      <Reorder
        items={option.values}
        label={`Values of ${labelOf(option.name) || 'the option'} in the order guests see them`}
        nameOf={value => labelOf(value.label) || 'value'}
        row={(value, _index, grip) => {
          const name = labelOf(value.label) || 'value'

          return (
            <div className="flex w-full min-w-0 flex-col py-0.5">
              <div className="flex min-w-0 items-start gap-1">
                {grip}
                {colours && <SwatchPicker name={name} value={value.swatch} onChange={swatch => draft.patchValue(option.ref, value.ref, { swatch })} />}
                <div className="grid min-w-0 flex-1 gap-1 sm:grid-cols-2">
                  {(['en', 'de'] as const).map(lang => (
                    <TextField key={lang} fullWidth aria-label={lang === 'en' ? `English text of ${name}` : `German text of ${name}`} className="flex-row items-center gap-2" value={value.label[lang]} onChange={text => draft.patchValue(option.ref, value.ref, { label: { ...value.label, [lang]: text } })}>
                      <span aria-hidden className="w-5 shrink-0 text-xs text-muted sm:hidden">{lang.toUpperCase()}</span>
                      <Input data-col={lang} lang={lang} maxLength={80} placeholder={lang === 'en' ? 'English' : 'German (optional)'} variant="secondary" onKeyDown={walkDown} />
                    </TextField>
                  ))}
                </div>
                <Button isIconOnly aria-label={`Delete the value ${name}`} className="shrink-0 text-danger max-lg:size-11" size="sm" variant="tertiary" onPress={() => draft.removeValue(option.ref, value.ref)}>
                  <TrashIcon aria-hidden size={16} />
                </Button>
              </div>
              <div className="ps-11 empty:hidden lg:ps-9">
                <ProblemLines at={value.ref} draft={draft} />
              </div>
            </div>
          )
        }}
        onMove={(from, to) => draft.moveValue(option.ref, from, to)}
      />
      <GhostRow colours={colours} draft={draft} option={option} />
    </div>
  )
}

function OptionSheet({ draft, option, onClose }: { draft: OptionsDraft, option: OptionDraft, onClose: () => void }) {
  const isNew = draft.isNew(option.ref)
  const title = isNew ? 'Add an option' : `Edit ${labelOf(option.name) || 'option'}`

  return (
    <SheetFrame
      isOpen
      footer={(
        <>
          <Button
            fullWidth
            className="min-h-11"
            isDisabled={!draft.dirty}
            onPress={() => {
              if (draft.save())
                onClose()
            }}
          >Save options
          </Button>
          <Button fullWidth className="min-h-11" variant="tertiary" onPress={() => { draft.discard(); onClose() }}>Cancel</Button>
        </>
      )}
      title={title}
      onClose={() => { draft.discard(); onClose() }}
    >
      <p className="text-sm text-pretty text-muted">
        {isNew && draft.variants.length > 0 ? 'Name it, add its values, and give every variant one of them. It all saves together.' : 'Values in the order guests see them. German is optional; without it German readers see the English.'}
      </p>
      {draft.tried && draft.problems.some(problem => problem.code !== 'value-duplicate') && (
        <p className="text-sm text-danger" role="alert">{`Not saved. ${draft.problems.filter(problem => problem.code !== 'value-duplicate').map(problem => problem.text).join(' ')}`}</p>
      )}
      <div className="grid grid-cols-2 gap-2">
        {(['en', 'de'] as const).map(lang => (
          <TextField key={lang} fullWidth value={option.name[lang]} onChange={name => draft.patchName(option.ref, { ...option.name, [lang]: name })}>
            <Label>{lang === 'en' ? 'Name (English)' : 'Name (German)'}</Label>
            <Input lang={lang} maxLength={60} placeholder={lang === 'en' ? 'Size, Theme…' : 'Grösse, Motiv…'} />
          </TextField>
        ))}
      </div>
      <ProblemLines at={option.ref} draft={draft} />
      <ValuesTable draft={draft} option={option} />
      {draft.needValues.some(o => o.ref === option.ref) && <AssignVariants draft={draft} option={option} />}
    </SheetFrame>
  )
}

export function OptionsA2({ draft }: { draft: OptionsDraft }) {
  // A scenario that starts with an unsaved option opens its sheet.
  const [openRef, setOpenRef] = useState<string | undefined>(() => draft.options.find(option => draft.isNew(option.ref))?.ref)
  const open = draft.options.find(option => option.ref === openRef)

  return (
    <Block hint="What guests choose between. Every variant has one value of each option." icon={OptionIcon} title="Options">
      {draft.options.length === 0 && <p className="text-sm text-pretty text-muted">No options: this keepsake is sold as one variant.</p>}
      <ul className="flex flex-col divide-y divide-separator" data-testid="option-rows">
        {draft.options.map((option) => {
          const users = variantsUsing(draft.variants, option.ref)
          const name = labelOf(option.name) || 'New option'

          return (
            <li key={option.ref} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
              <div className="flex items-start gap-2">
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{name}</span>
                  <span className="truncate text-xs text-muted" lang="de">{option.name.de || 'No German name'}</span>
                </div>
                <Button isIconOnly aria-label={`Edit ${name}`} className="max-lg:size-11" size="sm" variant="tertiary" onPress={() => setOpenRef(option.ref)}>
                  <EditIcon aria-hidden size={16} />
                </Button>
                <Button isIconOnly aria-label={`Delete the option ${name}`} className="text-danger max-lg:size-11" size="sm" variant="tertiary" onPress={() => draft.removeOption(option.ref)}>
                  <TrashIcon aria-hidden size={16} />
                </Button>
              </div>
              <ul aria-label={`Values of ${name}`} className="flex flex-wrap gap-1.5">
                {option.values.filter(value => labelOf(value.label)).map(value => (
                  <li key={value.ref}>
                    <Chip size="sm" variant="secondary">
                      <Swatch className="size-3" color={value.swatch} />
                      {labelOf(value.label)}
                    </Chip>
                  </li>
                ))}
              </ul>
              {users.length > 0 && <p className="text-xs text-muted">{`Used by ${plural(users.length, 'variant')}`}</p>}
              <ProblemLines at={option.ref} draft={draft} />
            </li>
          )
        })}
      </ul>
      {draft.notice && <p aria-live="polite" className="text-sm text-success" role="status">{draft.notice}</p>}
      <Button className="self-start max-lg:h-11" variant="secondary" onPress={() => setOpenRef(draft.addOption())}>
        <PlusIcon aria-hidden size={16} />
        Add option
      </Button>
      {open && <OptionSheet draft={draft} option={open} onClose={() => setOpenRef(undefined)} />}
    </Block>
  )
}
