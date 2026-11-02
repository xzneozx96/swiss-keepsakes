import type { OptionsDraftState } from '../hooks/use-options-draft'
import type { OptionDraft, ValueDraft } from '../lib/option-rules'

import { Button, Input, Popover, TextField } from '@heroui/react'
import { useEffect, useRef, useState } from 'react'

import { CloseIcon, GripIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { useStopDrag } from '@/hooks/use-stop-drag'
import { DEFAULT_SWATCH, labelOf, SWATCH_PRESETS, VALUE_LABEL_MAX, variantsUsing } from '../lib/option-rules'
import { NotesAt, QuietNote } from './option-bits'
import { Swatch } from './option-parts'

/** A colour for a value: eight named presets, and any colour from the browser's picker. */
function SwatchPicker({ value, name, onChange }: { value: string | null, name: string, onChange: (swatch: string | null) => void }) {
  const { t } = useLocale()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Popover isOpen={isOpen} onOpenChange={setIsOpen}>
      <Button isIconOnly aria-label={t(value ? 'keepsakes.options.colour.set' : 'keepsakes.options.colour.none', { name, colour: value ?? '' })} className="size-11 shrink-0 rounded-full lg:size-9" variant="ghost">
        {value
          ? <Swatch className="size-5" color={value} />
          : <span aria-hidden className="size-5 rounded-full border-2 border-dashed border-muted/60" />}
      </Button>
      <Popover.Content className="w-60" placement="bottom start">
        <Popover.Dialog aria-label={t('keepsakes.options.colour.of', { name })} className="flex flex-col gap-3 p-3">
          <div className="grid grid-cols-4 gap-1">
            {SWATCH_PRESETS.map(preset => (
              <button
                key={preset.hex}
                aria-label={t(`keepsakes.swatch.${preset.key}`)}
                aria-pressed={value === preset.hex}
                className="grid h-11 place-items-center rounded-xl outline-none hover:bg-default focus-visible:focus-ring aria-pressed:bg-default"
                type="button"
                onClick={() => {
                  onChange(preset.hex)
                  setIsOpen(false)
                }}
              >
                <Swatch className="size-6" color={preset.hex} />
              </button>
            ))}
          </div>
          <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
            {t('keepsakes.options.colour.any')}
            <input className="size-9 cursor-pointer rounded-lg border border-separator bg-transparent p-0.5" type="color" value={value ?? DEFAULT_SWATCH} onChange={event => onChange(event.target.value.toLowerCase())} />
          </label>
          <Button
            isDisabled={value === null}
            size="sm"
            variant="tertiary"
            onPress={() => {
              onChange(null)
              setIsOpen(false)
            }}
          >
            {t('keepsakes.options.colour.remove')}
          </Button>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  )
}

/** A value as plain text; a tap turns it into a field, Enter, Escape or leaving it keeps the change. */
function ValueRow({ draft, option, value, grip, swatches, lang }: { draft: OptionsDraftState, option: OptionDraft, value: ValueDraft, grip: React.ReactNode, swatches: boolean, lang: 'en' | 'de' }) {
  const { t } = useLocale()
  // What is being renamed, fixed when the field opens: the label must not change as the text does. The English list opens
  // a field on a tap; the German list is all fields, since every value is named there.
  const [editing, setEditing] = useState<{ name: string }>()
  const inputRef = useRef<HTMLInputElement>(null)
  const name = labelOf(value.label, 'en') || t('keepsakes.options.valueFallback')
  const users = draft.isSaved(value.ref) ? variantsUsing(draft.variants, option.ref, value.ref).length : 0

  useEffect(() => {
    if (editing)
      inputRef.current?.focus()
  }, [editing])

  return (
    <div className="flex w-full min-w-0 flex-col">
      <div className="flex min-h-11 min-w-0 items-center gap-1">
        {grip}
        {swatches && <SwatchPicker name={name} value={value.swatch} onChange={swatch => draft.patchValue(option.ref, value.ref, { swatch })} />}
        {lang === 'de'
          ? (
              <TextField fullWidth aria-label={t('keepsakes.options.rename', { name })} className="min-w-0 flex-1" value={value.label.de} onChange={text => draft.patchValue(option.ref, value.ref, { label: { ...value.label, de: text } })}>
                <Input lang="de" maxLength={VALUE_LABEL_MAX} placeholder={value.label.en} variant="secondary" />
              </TextField>
            )
          : editing
            ? (
                <TextField fullWidth aria-label={t('keepsakes.options.rename', { name: editing.name })} className="min-w-0 flex-1" value={value.label.en} onChange={text => draft.patchValue(option.ref, value.ref, { label: { ...value.label, en: text } })}>
                  <Input ref={inputRef} lang="en" maxLength={VALUE_LABEL_MAX} onBlur={() => setEditing(undefined)} onKeyDown={event => (event.key === 'Enter' || event.key === 'Escape') && setEditing(undefined)} />
                </TextField>
              )
            : (
                <button aria-label={t('keepsakes.options.rename', { name })} className="min-h-11 min-w-0 flex-1 truncate rounded-lg px-2 text-start outline-none hover:bg-default/50 focus-visible:focus-ring lg:min-h-9" type="button" onClick={() => setEditing({ name })}>
                  {name}
                </button>
              )}
        {users > 0 && <span className="shrink-0 text-xs text-muted tabular-nums">{t(users === 1 ? 'keepsakes.list.variants.one' : 'keepsakes.list.variants.other', { count: users })}</span>}
        <Button isIconOnly aria-label={t('keepsakes.options.removeValue', { name })} className="size-11 shrink-0 text-muted lg:size-9" variant="ghost" onPress={() => draft.removeValue(option.ref, value.ref)}>
          <CloseIcon aria-hidden size={16} />
        </Button>
      </div>
      <div className="ps-12 lg:ps-10">
        <NotesAt at={value.ref} draft={draft} />
      </div>
    </div>
  )
}

/**
 * The values in the order guests see them: a grip drags a row (pointer, touch or pen), the arrow keys on the grip move it
 * one step with the focus kept, and a live region says where it went. The photos of a keepsake reorder the same way.
 */
export function ValueList({ draft, option, lang }: { draft: OptionsDraftState, option: OptionDraft, lang: 'en' | 'de' }) {
  const { t } = useLocale()
  const listRef = useRef<HTMLOListElement>(null)
  const placeholderRef = useRef<HTMLDivElement>(null)
  const refocusRef = useRef<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const swatches = draft.swatchesOn(option)
  const nameOf = (value: ValueDraft) => labelOf(value.label, 'en') || t('keepsakes.options.valueFallback')

  const moveTo = (from: number, to: number) => {
    if (to < 0 || to >= option.values.length || to === from)
      return
    refocusRef.current = option.values[from]!.ref
    draft.moveValue(option.ref, from, to)
    setAnnouncement(t('keepsakes.options.moved', { name: nameOf(option.values[from]!), position: to + 1, count: option.values.length }))
  }
  const drag = useStopDrag({ listRef, placeholderRef, onStart: () => undefined, onDrop: moveTo })

  useEffect(() => {
    if (!refocusRef.current)
      return
    listRef.current?.querySelector<HTMLButtonElement>(`[data-row="${refocusRef.current}"] [data-grip]`)?.focus()
    refocusRef.current = null
  })

  return (
    <div className="relative">
      <ol ref={listRef} aria-label={t('keepsakes.options.valuesOf', { option: labelOf(option.name, 'en') || t('keepsakes.options.thisOption') })} className="flex flex-col">
        {option.values.map((value, index) => (
          <li key={value.ref} className="group" data-row={value.ref}>
            <div className="flex items-center gap-1 rounded-2xl group-data-[lifted]:bg-surface group-data-[lifted]:shadow-overlay">
              <ValueRow
                draft={draft}
                grip={(
                  <button
                    {...drag.handleProps(index)}
                    aria-label={t('keepsakes.options.move', { name: nameOf(value), position: index + 1, count: option.values.length })}
                    className="relative grid size-11 shrink-0 cursor-grab place-items-center rounded-full text-muted outline-none before:absolute before:-inset-1 before:content-[''] focus-visible:focus-ring active:cursor-grabbing lg:size-9"
                    data-grip=""
                    style={{ touchAction: 'none' }}
                    type="button"
                    onKeyDown={(event) => {
                      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                        event.preventDefault()
                        moveTo(index, index + (event.key === 'ArrowUp' ? -1 : 1))
                      }
                      drag.handleProps(index).onKeyDown?.(event)
                    }}
                  >
                    <GripIcon aria-hidden size={18} />
                  </button>
                )}
                option={option}
                lang={lang}
                swatches={swatches}
                value={value}
              />
            </div>
          </li>
        ))}
      </ol>
      <div ref={placeholderRef} aria-hidden hidden className="pointer-events-none absolute inset-x-0 rounded-2xl border-2 border-dashed border-accent bg-accent/10" />
      <p aria-live="polite" className="sr-only" role="status">{announcement}</p>
    </div>
  )
}

/**
 * One field adds values in the language of the tab: Enter adds, a pasted list ("Small, Medium, Large") adds several, and
 * leaving the field (Tab, a click elsewhere, the other language) adds what is typed too, so nothing typed is lost. Words
 * the option has already stay in the field.
 */
export function AddValue({ draft, option, lang }: { draft: OptionsDraftState, option: OptionDraft, lang: 'en' | 'de' }) {
  const { t } = useLocale()
  const [text, setText] = useState('')
  const [refused, setRefused] = useState<string[]>([])
  const commit = () => {
    if (!text.trim())
      return
    const result = draft.addValues(option.ref, text, lang)

    setRefused(result.refused)
    setText(result.refused.join(', '))
  }
  // The language tabs do not take the focus on press, so switching language swaps this field (it is keyed by language)
  // without a blur: what is still typed is added when the field goes away.
  const pendingRef = useRef<() => void>(undefined)

  useEffect(() => {
    pendingRef.current = () => {
      if (text.trim())
        draft.addValues(option.ref, text, lang)
    }
  })
  useEffect(() => () => pendingRef.current?.(), [])

  return (
    <div className="flex flex-col gap-1">
      <TextField fullWidth aria-label={t('keepsakes.options.addValue.label', { option: labelOf(option.name, 'en') || t('keepsakes.options.thisOption') })} value={text} onChange={(next) => { setText(next); setRefused([]) }}>
        <Input
          lang={lang}
          placeholder={t('keepsakes.options.addValue.placeholder')}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commit()
            }
          }}
        />
      </TextField>
      {refused.length > 0
        ? <QuietNote>{t(refused.length === 1 ? 'keepsakes.options.addValue.alreadyOne' : 'keepsakes.options.addValue.alreadyMany', { values: refused.join(', ') })}</QuietNote>
        : <p className="text-xs text-muted">{t('keepsakes.options.addValue.hint')}</p>}
    </div>
  )
}
