/**
 * A3: values are chips. A chip opens a small editor (English, German, colour, earlier or later, delete); the last chip
 * adds. Edits inline in the Options step. Reorder: drag a chip with a mouse, Alt and the arrow keys on a focused chip,
 * or Earlier and Later in the chip's editor (touch and screen readers).
 */
import type { OptionDraft, ValueDraft } from './keepsake-options-data'
import type { OptionsDraft } from './keepsake-options-state'

import { Button, Input, Label, Popover, TextField } from '@heroui/react'
import { useEffect, useRef, useState } from 'react'

import { ChevronLeftIcon, ChevronRightIcon, OptionIcon, PlusIcon, TrashIcon } from '@/components/icons'
import { Swatch } from '@/features/keepsakes/components/option-parts'
import { Block } from '@/features/places/components/fields'
import { SWATCH_PRESETS } from './keepsake-options-data'
import { AssignVariants, DraftBar, ProblemLines } from './keepsake-options-parts'
import { labelOf } from './keepsake-options-rules'

const chip = 'h-10 min-w-0 gap-2 rounded-full px-3.5 max-lg:h-11'

/** The small editor of one value. */
function ValueEditor({ draft, option, value, index }: { draft: OptionsDraft, option: OptionDraft, value: ValueDraft, index: number }) {
  const name = labelOf(value.label) || 'new value'
  const last = option.values.length - 1

  return (
    <Popover.Dialog aria-label={`Edit ${name}`} className="flex flex-col gap-3 p-3">
      <TextField fullWidth value={value.label.en} onChange={en => draft.patchValue(option.ref, value.ref, { label: { ...value.label, en } })}>
        <Label>English</Label>
        <Input lang="en" maxLength={80} />
      </TextField>
      <TextField fullWidth value={value.label.de} onChange={de => draft.patchValue(option.ref, value.ref, { label: { ...value.label, de } })}>
        <Label>German (optional)</Label>
        <Input lang="de" maxLength={80} placeholder={value.label.en} />
      </TextField>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">Colour (optional)</span>
        <div className="flex flex-wrap items-center gap-1">
          {SWATCH_PRESETS.map(hex => (
            <button
              key={hex}
              aria-label={hex}
              aria-pressed={value.swatch === hex}
              className="grid size-11 place-items-center rounded-full outline-none hover:bg-default focus-visible:focus-ring aria-pressed:bg-default lg:size-9"
              type="button"
              onClick={() => draft.patchValue(option.ref, value.ref, { swatch: value.swatch === hex ? null : hex })}
            >
              <Swatch className="size-5" color={hex} />
            </button>
          ))}
        </div>
      </div>
      <ProblemLines at={value.ref} draft={draft} />
      {/* Not disabled at the ends: a button that disables itself under the finger drops the focus. */}
      <div className="flex items-center gap-1">
        <Button aria-disabled={index === 0} className={index === 0 ? 'opacity-50' : ''} size="sm" variant="tertiary" onPress={() => draft.moveValue(option.ref, index, index - 1)}>
          <ChevronLeftIcon aria-hidden size={14} />
          Earlier
        </Button>
        <Button aria-disabled={index === last} className={index === last ? 'opacity-50' : ''} size="sm" variant="tertiary" onPress={() => draft.moveValue(option.ref, index, index + 1)}>
          Later
          <ChevronRightIcon aria-hidden size={14} />
        </Button>
        <Button className="ms-auto text-danger" size="sm" variant="tertiary" onPress={() => draft.removeValue(option.ref, value.ref)}>
          <TrashIcon aria-hidden size={14} />
          Delete
        </Button>
      </div>
    </Popover.Dialog>
  )
}

function AddChip({ draft, option }: { draft: OptionsDraft, option: OptionDraft }) {
  const [isOpen, setIsOpen] = useState(false)
  const [text, setText] = useState('')
  const [refused, setRefused] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen)
      inputRef.current?.focus()
  }, [isOpen])

  if (!isOpen) {
    return (
      <Button className={`${chip} border border-dashed border-muted/60`} variant="ghost" onPress={() => setIsOpen(true)}>
        <PlusIcon aria-hidden size={14} />
        Add value
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <TextField aria-label={`New value of ${labelOf(option.name) || 'the option'}`} value={text} onChange={setText}>
        <Input
          ref={inputRef}
          className="h-10 w-44 rounded-full max-lg:h-11"
          maxLength={80}
          placeholder="Type, then Enter"
          onBlur={() => { setIsOpen(false); setText(''); setRefused('') }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setIsOpen(false)
            }
            if (event.key === 'Enter') {
              event.preventDefault()
              if (!text.trim())
                return
              const [duplicate] = draft.addValues(option.ref, [text.trim()])

              setRefused(duplicate ?? '')
              if (!duplicate)
                setText('')
            }
          }}
        />
      </TextField>
      {refused && <p className="text-xs text-danger" role="alert">{`${refused} is already a value.`}</p>}
    </div>
  )
}

function Chips({ draft, option }: { draft: OptionsDraft, option: OptionDraft }) {
  const dragFromRef = useRef<number | null>(null)
  const refocusRef = useRef<string | null>(null)
  const [over, setOver] = useState<number | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const optionName = labelOf(option.name) || 'the option'

  useEffect(() => {
    if (!refocusRef.current)
      return
    document.querySelector<HTMLButtonElement>(`[data-chip="${refocusRef.current}"] button`)?.focus()
    refocusRef.current = null
  })

  const moveTo = (from: number, to: number) => {
    if (to < 0 || to >= option.values.length || to === from)
      return
    refocusRef.current = option.values[from]!.ref
    draft.moveValue(option.ref, from, to)
    setAnnouncement(`${labelOf(option.values[from]!.label)} moved to position ${to + 1} of ${option.values.length}.`)
  }

  return (
    <div className="flex flex-wrap items-start gap-2" role="list" aria-label={`Values of ${optionName} in the order guests see them`}>
      {option.values.map((value, index) => {
        const name = labelOf(value.label) || 'new value'
        const noGerman = !value.label.de.trim()

        return (
          <div
            key={value.ref}
            draggable
            className={`rounded-full ${over === index ? 'outline-2 outline-offset-2 outline-accent' : ''}`}
            data-chip={value.ref}
            role="listitem"
            onDragEnd={() => { dragFromRef.current = null; setOver(null) }}
            onDragOver={(event) => { event.preventDefault(); setOver(index) }}
            onDragStart={() => { dragFromRef.current = index }}
            onDrop={() => {
              if (dragFromRef.current !== null)
                moveTo(dragFromRef.current, index)
              dragFromRef.current = null
              setOver(null)
            }}
          >
            <Popover>
              <Button
                aria-label={`${name}, position ${index + 1} of ${option.values.length}${noGerman ? ', no German text' : ''}. Edit. Alt and arrow keys move it.`}
                className={chip}
                variant="tertiary"
                onKeyDown={(event) => {
                  if (event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
                    event.preventDefault()
                    moveTo(index, index + (event.key === 'ArrowLeft' ? -1 : 1))
                  }
                }}
              >
                <Swatch color={value.swatch} />
                <span className="truncate">{labelOf(value.label)}</span>
                {noGerman && <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-warning" title="No German text" />}
              </Button>
              <Popover.Content className="w-72" placement="bottom start">
                <ValueEditor draft={draft} index={index} option={option} value={value} />
              </Popover.Content>
            </Popover>
          </div>
        )
      })}
      <AddChip draft={draft} option={option} />
      <p aria-live="polite" className="sr-only" role="status">{announcement}</p>
    </div>
  )
}

function OptionSection({ draft, option }: { draft: OptionsDraft, option: OptionDraft }) {
  const [showGerman, setShowGerman] = useState(false)
  const optionName = labelOf(option.name) || 'new option'
  const german = showGerman || option.name.de !== ''
  const noGerman = option.values.filter(value => !value.label.de.trim()).length

  return (
    <section aria-label={optionName} className="flex flex-col gap-3 border-t border-separator pt-4 first:border-t-0 first:pt-0" data-option={option.ref}>
      <div className="flex items-end gap-2">
        <div className="grid min-w-0 flex-1 items-end gap-2 sm:grid-cols-2">
          <TextField fullWidth value={option.name.en} onChange={en => draft.patchName(option.ref, { ...option.name, en })}>
            <Label>Option name</Label>
            <Input lang="en" maxLength={60} placeholder="Size, Theme, Colour…" />
          </TextField>
          {german
            ? (
                <TextField fullWidth value={option.name.de} onChange={de => draft.patchName(option.ref, { ...option.name, de })}>
                  <Label>German name (optional)</Label>
                  <Input lang="de" maxLength={60} placeholder="Grösse, Motiv, Farbe…" />
                </TextField>
              )
            : <Button className="w-fit max-lg:h-11" variant="tertiary" onPress={() => setShowGerman(true)}>Add a German name</Button>}
        </div>
        <Button isIconOnly aria-label={`Delete the option ${optionName}`} className="shrink-0 max-lg:size-11" variant="danger-soft" onPress={() => draft.removeOption(option.ref)}>
          <TrashIcon aria-hidden size={16} />
        </Button>
      </div>
      <ProblemLines at={option.ref} draft={draft} />
      <Chips draft={draft} option={option} />
      {option.values.length > 0 && (
        <p className="text-xs text-muted">
          {noGerman === 0 ? 'Every value has a German text.' : `${noGerman} of ${option.values.length} values have no German text yet (orange dot). German readers see the English.`}
          {' '}
          Tap a value to edit it; drag, or Alt and the arrow keys, to reorder.
        </p>
      )}
      {draft.needValues.some(o => o.ref === option.ref) && <AssignVariants draft={draft} option={option} />}
    </section>
  )
}

export function OptionsA3({ draft }: { draft: OptionsDraft }) {
  return (
    <Block hint="What guests choose between. Every variant has one value of each option." icon={OptionIcon} title="Options">
      {draft.options.length === 0 && <p className="text-sm text-pretty text-muted">No options: this keepsake is sold as one variant.</p>}
      {draft.options.map(option => <OptionSection key={option.ref} draft={draft} option={option} />)}
      <Button className="self-start max-lg:h-11" variant="secondary" onPress={() => draft.addOption()}>
        <PlusIcon aria-hidden size={16} />
        Add option
      </Button>
      <DraftBar draft={draft} />
    </Block>
  )
}
