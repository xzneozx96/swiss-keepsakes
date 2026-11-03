/**
 * O2 · A plain page you type on. No field boxes: the option name is a heading you click into, the values are a numbered
 * list of plain lines. Enter starts the next value, Backspace on an empty line removes it, a pasted list becomes many
 * lines, Alt and the arrow keys move a line. The rest (colours, delete) waits in the option's ⋯ menu; German is one
 * switch for the page. Borrowed from Linear's issue editor and Notion's lists.
 */
import type { ClipboardEvent, KeyboardEvent } from 'react'
import type { OptionDraft } from './keepsake-options-data'
import type { OptionDesignDraft } from './option-design-state'

import { Button, Label, Switch } from '@heroui/react'
import { useState } from 'react'

import { Block } from '@/components/form-block'
import { OptionIcon, PlusIcon, TrashIcon } from '@/components/icons'
import { RowActions } from '@/components/row-actions'
import { Reorder, SwatchPicker } from './keepsake-options-parts'
import { labelOf, splitValues } from './keepsake-options-rules'
import { AssignPanel, NotesAt, SaveLine } from './option-design-parts'

/** Plain text until you point at it or type in it. Lab only; the product would need a shared inline-text field. */
const INLINE = 'w-full min-w-0 rounded-lg bg-transparent px-2 outline-none transition-colors duration-150 placeholder:text-muted/70 hover:bg-default/60 focus:bg-default'

function focusSoon(id: string) {
  requestAnimationFrame(() => {
    const input = document.getElementById(id) as HTMLInputElement | null

    input?.focus()
    input?.setSelectionRange(input.value.length, input.value.length)
  })
}

function ValueLines({ draft, option, german }: { draft: OptionDesignDraft, option: OptionDraft, german: boolean }) {
  const colours = option.values.some(v => v.swatch !== null)
  const name = labelOf(option.name) || 'the option'
  const idOf = (ref: string) => `${ref}-line`

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    const value = option.values[index]!

    if (event.key === 'Enter') {
      event.preventDefault()
      focusSoon(idOf(draft.insertBlank(option.ref, index + 1)))
    }
    else if (event.key === 'Backspace' && event.currentTarget.value === '' && !value.label.de) {
      event.preventDefault()
      const before = option.values[index - 1]

      if (draft.removeValue(option.ref, value.ref) && before)
        focusSoon(idOf(before.ref))
    }
    else if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      event.preventDefault()
      const to = index + (event.key === 'ArrowUp' ? -1 : 1)

      if (to >= 0 && to < option.values.length) {
        draft.moveValue(option.ref, index, to)
        focusSoon(idOf(value.ref))
      }
    }
  }
  const onPaste = (event: ClipboardEvent<HTMLInputElement>, index: number) => {
    const text = event.clipboardData.getData('text')

    if (splitValues(text).length < 2)
      return
    event.preventDefault()
    draft.addValues(option.ref, text, index + 1)
  }
  const addLine = () => focusSoon(idOf(draft.insertBlank(option.ref, option.values.length)))

  return (
    <div className="flex flex-col">
      {option.values.length > 0 && (
        <Reorder
          items={option.values}
          label={`Values of ${name}, in the order guests see them`}
          nameOf={value => labelOf(value.label) || 'value'}
          row={(value, index, grip) => {
            const valueName = labelOf(value.label) || 'value'

            return (
              <div className="flex w-full min-w-0 flex-col">
                <div className="flex min-w-0 items-start">
                  <span aria-hidden className="flex h-11 w-6 shrink-0 items-center justify-end text-sm text-muted tabular-nums lg:h-9">{index + 1}</span>
                  <span className="w-1 shrink-0" />
                  {colours && <SwatchPicker name={valueName} size="size-5" value={value.swatch} onChange={swatch => draft.patchValue(option.ref, value.ref, { swatch })} />}
                  <div className="flex min-w-0 flex-1 flex-col">
                    <input
                      aria-label={`Value ${index + 1} of ${name}`}
                      aria-keyshortcuts="Enter Backspace Alt+ArrowUp Alt+ArrowDown"
                      className={`${INLINE} h-11 lg:h-9`}
                      id={idOf(value.ref)}
                      maxLength={80}
                      placeholder="Value"
                      value={value.label.en}
                      onChange={event => draft.patchValue(option.ref, value.ref, { label: { ...value.label, en: event.target.value } })}
                      onKeyDown={event => onKeyDown(event, index)}
                      onPaste={event => onPaste(event, index)}
                    />
                    {german && (
                      <input
                        aria-label={`German for ${valueName}`}
                        className={`${INLINE} -mt-1 h-8 text-sm text-muted focus:text-foreground`}
                        lang="de"
                        maxLength={80}
                        placeholder="German"
                        value={value.label.de}
                        onChange={event => draft.patchValue(option.ref, value.ref, { label: { ...value.label, de: event.target.value } })}
                      />
                    )}
                  </div>
                  <span className="pointer-fine:opacity-0 pointer-fine:transition-opacity pointer-fine:group-focus-within:opacity-100 pointer-fine:group-hover:opacity-100">{grip}</span>
                </div>
                <div className="ps-9">
                  <NotesAt at={value.ref} draft={draft} />
                </div>
              </div>
            )
          }}
          onMove={(from, to) => draft.moveValue(option.ref, from, to)}
        />
      )}
      <button className="ms-7 inline-flex min-h-11 items-center gap-2 self-start rounded-lg px-2 text-sm text-muted outline-none hover:text-foreground focus-visible:focus-ring lg:min-h-9" type="button" onClick={addLine}>
        <PlusIcon aria-hidden size={14} />
        Add value
      </button>
    </div>
  )
}

function OptionSection({ draft, option, german }: { draft: OptionDesignDraft, option: OptionDraft, german: boolean }) {
  const colours = option.values.some(v => v.swatch !== null)
  const name = labelOf(option.name) || 'option'

  return (
    <section aria-label={labelOf(option.name) || 'New option'} className="flex flex-col gap-1" data-testid="page-option">
      <div className="flex items-center gap-1">
        <input
          aria-label="Option name"
          className={`${INLINE} -ms-2 h-11 text-lg font-semibold`}
          id={`${option.ref}-name`}
          maxLength={60}
          placeholder="Option name"
          value={option.name.en}
          onChange={event => draft.patchName(option.ref, { ...option.name, en: event.target.value })}
        />
        <RowActions
          actions={[
            { id: 'colours', label: colours ? 'Remove colour swatches' : 'Add colour swatches', icon: OptionIcon },
            { id: 'delete', label: 'Delete option', icon: TrashIcon, isDanger: true },
          ]}
          label={`More for ${name}`}
          onAction={id => (id === 'colours' ? draft.setSwatches(option.ref, !colours) : draft.removeOption(option.ref))}
        />
      </div>
      {german && (
        <input
          aria-label={`German name of ${name}`}
          className={`${INLINE} -ms-2 -mt-1 h-8 text-sm text-muted focus:text-foreground`}
          lang="de"
          maxLength={60}
          placeholder="German name"
          value={option.name.de}
          onChange={event => draft.patchName(option.ref, { ...option.name, de: event.target.value })}
        />
      )}
      <NotesAt at={option.ref} draft={draft} />
      <div className="mt-1">
        <ValueLines draft={draft} german={german} option={option} />
      </div>
      {draft.needValues.some(o => o.ref === option.ref) && (
        <div className="mt-3">
          <AssignPanel draft={draft} option={option} />
        </div>
      )}
    </section>
  )
}

export function OptionsO2({ draft }: { draft: OptionDesignDraft }) {
  const [german, setGerman] = useState(false)
  const add = () => {
    const ref = draft.addOption()

    focusSoon(`${ref}-name`)
  }

  return (
    <Block hint="What guests choose between. Type a value, press Enter for the next." icon={OptionIcon} title="Options">
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
              <Switch className="min-h-11 lg:min-h-9 lg:self-end" isSelected={german} onChange={setGerman}>
                <Switch.Content className="items-center">
                  <Label className="text-sm text-muted">{draft.missingGerman > 0 ? `German names · ${draft.missingGerman} missing` : 'German names'}</Label>
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch.Content>
              </Switch>
              <div className="flex flex-col gap-10">
                {draft.options.map(option => <OptionSection key={option.ref} draft={draft} german={german} option={option} />)}
              </div>
              <Button className="-ms-4 self-start max-lg:h-11" variant="ghost" onPress={add}>
                <PlusIcon aria-hidden size={16} />
                Add option
              </Button>
              <SaveLine draft={draft} />
            </>
          )}
    </Block>
  )
}
