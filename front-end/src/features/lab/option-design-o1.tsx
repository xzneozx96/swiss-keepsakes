/**
 * O1 · Summary, then one at a time. Each option reads as one quiet row: its name and its values as pills. A tap opens
 * that option in place (only one is open), with plain fields, a grip per value and an empty "Add another value" field
 * last. Colours and German are two quiet toggles inside the open option. Borrowed from Shopify's 2023 options editor.
 */
import type { OptionDraft } from './keepsake-options-data'
import type { OptionDesignDraft } from './option-design-state'

import { Button, Input, Label, TextField } from '@heroui/react'
import { useState } from 'react'

import { Block } from '@/components/form-block'
import { CheckIcon, ChevronRightIcon, CloseIcon, OptionIcon, PlusIcon } from '@/components/icons'
import { Reorder, SwatchPicker } from './keepsake-options-parts'
import { labelOf } from './keepsake-options-rules'
import { AssignPanel, NotesAt, QuietNote, SaveLine, ValuePills } from './option-design-parts'

/** A quiet text toggle: muted, the mark turns to a check when on. */
const TOGGLE = 'inline-flex min-h-11 items-center gap-1.5 rounded-lg text-sm font-medium text-muted outline-none hover:text-foreground focus-visible:focus-ring aria-pressed:text-foreground lg:min-h-9'

function focusSoon(id: string) {
  requestAnimationFrame(() => document.getElementById(id)?.focus())
}

function hasNotes(draft: OptionDesignDraft, option: OptionDraft) {
  return [option.ref, ...option.values.map(v => v.ref), `${option.ref}:assign`].some(at => draft.problemsAt(at).length > 0 || draft.refusalAt(at))
}

function SummaryRow({ draft, option, onOpen }: { draft: OptionDesignDraft, option: OptionDraft, onOpen: () => void }) {
  const name = labelOf(option.name) || 'Unnamed option'

  return (
    <button
      aria-label={`Edit ${name}`}
      className="group -mx-2 flex w-[calc(100%+1rem)] items-center gap-4 rounded-2xl px-2 py-4 text-start outline-none transition-colors duration-150 hover:bg-default/50 focus-visible:focus-ring"
      type="button"
      onClick={onOpen}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
        <span className="flex flex-col sm:w-32 sm:shrink-0">
          <span className="font-medium">{name}</span>
          {hasNotes(draft, option) && <span className="text-xs text-danger">Needs a look</span>}
        </span>
        <ValuePills option={option} />
      </span>
      <ChevronRightIcon aria-hidden className="shrink-0 text-muted transition-transform duration-150 group-hover:translate-x-0.5" size={18} />
    </button>
  )
}

function AddValueField({ draft, option }: { draft: OptionDesignDraft, option: OptionDraft }) {
  const [text, setText] = useState('')
  const [refused, setRefused] = useState<string[]>([])

  const commit = () => {
    if (!text.trim())
      return
    const result = draft.addValues(option.ref, text)

    setRefused(result.refused)
    setText(result.refused.join(', '))
  }

  return (
    <div className="flex flex-col gap-1 ps-12 pe-12 lg:ps-10 lg:pe-10">
      <TextField fullWidth aria-label={`Add a value to ${labelOf(option.name) || 'the option'}`} value={text} onChange={(next) => { setText(next); setRefused([]) }}>
        <Input
          id={`${option.ref}-add`}
          placeholder="Add another value"
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commit()
            }
          }}
        />
      </TextField>
      {refused.length > 0 && <QuietNote>{`${refused.join(', ')} ${refused.length === 1 ? 'is' : 'are'} already in the list.`}</QuietNote>}
    </div>
  )
}

function OpenOption({ draft, option, onDone }: { draft: OptionDesignDraft, option: OptionDraft, onDone: () => void }) {
  const [german, setGerman] = useState(false)
  const colours = option.values.some(v => v.swatch !== null)
  const name = labelOf(option.name) || 'the option'
  const missing = [option.name, ...option.values.map(v => v.label)].filter(t => t.en.trim() && !t.de.trim()).length

  return (
    <div className="flex flex-col gap-5 py-5" data-testid="open-option">
      <div className="flex flex-col gap-2">
        <div className={`grid gap-2 ${german ? 'sm:grid-cols-2' : ''}`}>
          <TextField fullWidth value={option.name.en} onChange={en => draft.patchName(option.ref, { ...option.name, en })}>
            <Label>Option name</Label>
            <Input id={`${option.ref}-name`} placeholder="Size, Colour, Theme…" />
          </TextField>
          {german && (
            <TextField fullWidth value={option.name.de} onChange={de => draft.patchName(option.ref, { ...option.name, de })}>
              <Label className="text-muted">German (optional)</Label>
              <Input lang="de" placeholder={option.name.en ? `German for “${option.name.en}”` : 'German name'} variant="secondary" />
            </TextField>
          )}
        </div>
        <NotesAt at={option.ref} draft={draft} />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Values</span>
        {option.values.length > 0 && (
          <Reorder
            items={option.values}
            label={`Values of ${name}, in the order guests see them`}
            nameOf={value => labelOf(value.label) || 'value'}
            row={(value, _index, grip) => {
              const valueName = labelOf(value.label) || 'value'

              return (
                <div className="flex w-full min-w-0 flex-col gap-1 py-1">
                  <div className="flex min-w-0 items-start gap-1">
                    {grip}
                    <div className="flex min-w-0 flex-1 items-start gap-2">
                      {colours && <SwatchPicker name={valueName} value={value.swatch} onChange={swatch => draft.patchValue(option.ref, value.ref, { swatch })} />}
                      <div className={`grid min-w-0 flex-1 gap-1 ${german ? 'sm:grid-cols-2 sm:gap-2' : ''}`}>
                        <TextField fullWidth aria-label={`Value ${valueName}`} value={value.label.en} onChange={en => draft.patchValue(option.ref, value.ref, { label: { ...value.label, en } })}>
                          <Input />
                        </TextField>
                        {german && (
                          <TextField fullWidth aria-label={`German for ${valueName}`} value={value.label.de} onChange={de => draft.patchValue(option.ref, value.ref, { label: { ...value.label, de } })}>
                            <Input lang="de" placeholder="German (optional)" variant="secondary" />
                          </TextField>
                        )}
                      </div>
                    </div>
                    <Button isIconOnly aria-label={`Remove ${valueName}`} className="size-11 shrink-0 text-muted lg:size-9" variant="ghost" onPress={() => draft.removeValue(option.ref, value.ref)}>
                      <CloseIcon aria-hidden size={16} />
                    </Button>
                  </div>
                  <div className="ps-12 lg:ps-10">
                    <NotesAt at={value.ref} draft={draft} />
                  </div>
                </div>
              )
            }}
            onMove={(from, to) => draft.moveValue(option.ref, from, to)}
          />
        )}
        <AddValueField draft={draft} option={option} />
      </div>

      {draft.needValues.some(o => o.ref === option.ref) && <AssignPanel draft={draft} option={option} />}

      <div className="flex flex-wrap items-center gap-x-5">
        <button aria-pressed={colours} className={TOGGLE} type="button" onClick={() => draft.setSwatches(option.ref, !colours)}>
          {colours ? <CheckIcon aria-hidden size={14} /> : <PlusIcon aria-hidden size={14} />}
          Colour swatches
        </button>
        <button aria-pressed={german} className={TOGGLE} type="button" onClick={() => setGerman(g => !g)}>
          {german ? <CheckIcon aria-hidden size={14} /> : <PlusIcon aria-hidden size={14} />}
          {missing > 0 ? `German · ${missing} missing` : 'German'}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <Button
          className="-ms-4 me-auto text-danger max-lg:h-11"
          variant="ghost"
          onPress={() => {
            if (draft.removeOption(option.ref))
              onDone()
          }}
        >Delete option
        </Button>
        <Button className="max-lg:h-11" variant="tertiary" onPress={onDone}>Done</Button>
      </div>
    </div>
  )
}

export function OptionsO1({ draft }: { draft: OptionDesignDraft }) {
  const [openRef, setOpenRef] = useState<string | null>(() => draft.options.find(option => draft.isNew(option.ref) || hasNotes(draft, option))?.ref ?? null)

  const add = () => {
    const ref = draft.addOption()

    setOpenRef(ref)
    focusSoon(`${ref}-name`)
  }

  return (
    <Block hint="What guests choose between, like size or colour." icon={OptionIcon} title="Options">
      {draft.options.length === 0
        ? (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <p className="max-w-xs text-sm text-pretty text-muted">Add an option if this keepsake comes in versions, for example a size or a colour.</p>
              <Button className="max-lg:h-11" onPress={add}>
                <PlusIcon aria-hidden size={16} />
                Add option
              </Button>
            </div>
          )
        : (
            <>
              <ul className="flex flex-col divide-y divide-separator">
                {draft.options.map(option => (
                  <li key={option.ref}>
                    {openRef === option.ref
                      ? <OpenOption draft={draft} option={option} onDone={() => setOpenRef(null)} />
                      : <SummaryRow draft={draft} option={option} onOpen={() => setOpenRef(option.ref)} />}
                  </li>
                ))}
              </ul>
              <Button className="-ms-4 self-start max-lg:h-11" variant="ghost" onPress={add}>
                <PlusIcon aria-hidden size={16} />
                Add another option
              </Button>
            </>
          )}
      {(draft.dirty || draft.notice || draft.options.length > 0) && <SaveLine draft={draft} />}
    </Block>
  )
}
