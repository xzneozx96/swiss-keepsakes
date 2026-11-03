import type { OptionsDraftState } from '../hooks/use-options-draft'
import type { OptionDraft, ValueDraft } from '../lib/option-rules'

import { Button, Input, TextField } from '@heroui/react'
import { useEffect, useRef, useState } from 'react'

import { GripIcon, TrashIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { useStopDrag } from '@/hooks/use-stop-drag'
import { labelOf, VALUE_LABEL_MAX, variantsUsing } from '../lib/option-rules'
import { NotesAt, QuietNote } from './option-bits'

/** The caret goes to the end of the text when a row takes the focus, so typing carries on where it was. */
function focusAtEnd(input: HTMLInputElement | null) {
  if (!input)
    return
  input.focus()
  input.setSelectionRange(input.value.length, input.value.length)
}

/**
 * A value as a field in its row: the grip, the name and the delete icon. On the German
 * version each value shows its English name beside the field for its German one. A value that a variant holds can't be
 * deleted: the icon is off and the row says why (ADR-027). `focused` is the value that a typed character just made, so
 * the typing goes on in its own field.
 */
function ValueRow({ draft, option, value, grip, lang, focused, onFocused }: { draft: OptionsDraftState, option: OptionDraft, value: ValueDraft, grip: React.ReactNode, lang: 'en' | 'de', focused: string | undefined, onFocused: () => void }) {
  const { t } = useLocale()
  const inputRef = useRef<HTMLInputElement>(null)
  const name = labelOf(value.label, 'en') || t('keepsakes.options.valueFallback')
  const holding = draft.isSaved(value.ref) ? variantsUsing(draft.variants, option.ref, value.ref) : []
  const users = holding.length
  // The live variants are the ones on screen; the archived ones are counted apart.
  const archived = holding.filter(variant => variant.status === 'archived').length
  const live = users - archived
  const used = users === 0
    ? undefined
    : archived === 0
      ? t(users === 1 ? 'keepsakes.options.valueInUse.one' : 'keepsakes.options.valueInUse.other', { count: users })
      : t(live > 0 ? 'keepsakes.options.valueInUse.mixed' : 'keepsakes.options.valueInUse.archivedOnly', { live, archived })

  useEffect(() => {
    if (focused === value.ref && lang === 'en') {
      focusAtEnd(inputRef.current)
      onFocused()
    }
  }, [focused, value.ref, lang, onFocused])

  return (
    <div className="flex w-full min-w-0 flex-col">
      <div className="flex min-h-11 min-w-0 items-center gap-1">
        {grip}
        {lang === 'de'
          ? (
              // The English layout: one full-width field, the English name as its placeholder and in the line under it.
              <TextField fullWidth aria-label={t('keepsakes.options.germanName.label', { name })} className="min-w-0 flex-1" value={value.label.de} onChange={text => draft.patchValue(option.ref, value.ref, { label: { ...value.label, de: text } })}>
                <Input lang="de" maxLength={VALUE_LABEL_MAX} placeholder={value.label.en || t('keepsakes.options.germanName.placeholder')} />
              </TextField>
            )
          : (
              <TextField fullWidth aria-label={t('keepsakes.options.valueName', { position: option.values.indexOf(value) + 1 })} className="min-w-0 flex-1" value={value.label.en} onChange={text => draft.patchValue(option.ref, value.ref, { label: { ...value.label, en: text } })}>
                <Input ref={inputRef} lang="en" maxLength={VALUE_LABEL_MAX} placeholder={t('keepsakes.options.valueFallback')} />
              </TextField>
            )}
        <Button isIconOnly aria-label={used ? t('keepsakes.options.removeValue.used', { name, reason: used }) : t('keepsakes.options.removeValue', { name })} className="size-11 shrink-0 text-danger lg:size-9" isDisabled={users > 0} variant="ghost" onPress={() => draft.removeValue(option.ref, value.ref)}>
          <TrashIcon aria-hidden size={16} />
        </Button>
      </div>
      {(used || (lang === 'de' && value.label.en)) && (
        <p className="ps-12 text-xs text-muted lg:ps-10">
          {lang === 'de' && value.label.en && (
            <>
              {t('keepsakes.options.english')}
              {' '}
              <span lang="en">{value.label.en}</span>
              {used && ' · '}
            </>
          )}
          {used}
        </p>
      )}
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
export function ValueList({ draft, option, lang, focused, onFocused }: { draft: OptionsDraftState, option: OptionDraft, lang: 'en' | 'de', focused: string | undefined, onFocused: () => void }) {
  const { t } = useLocale()
  const listRef = useRef<HTMLOListElement>(null)
  const placeholderRef = useRef<HTMLDivElement>(null)
  const refocusRef = useRef<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
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
                focused={focused}
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
                value={value}
                onFocused={onFocused}
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
 * The empty field under the last value (the English version). Typing in it makes a value of what was typed and moves the
 * typing into that value's own field, with a fresh empty field below; a pasted list ("Small, Medium, Large") makes several.
 * Words the option has already stay in the field and are named.
 */
export function AddValue({ draft, option, onAdded }: { draft: OptionsDraftState, option: OptionDraft, onAdded: (ref: string) => void }) {
  const { t } = useLocale()
  const [text, setText] = useState('')
  const [refused, setRefused] = useState<string[]>([])

  return (
    <div className="flex flex-col gap-1">
      <div className="flex min-h-11 items-center ps-12 lg:ps-10">
        <TextField
          fullWidth
          aria-label={t('keepsakes.options.addValue.label', { option: labelOf(option.name, 'en') || t('keepsakes.options.thisOption') })}
          className="min-w-0 flex-1"
          value={text}
          onChange={(next) => {
            if (!next.trim()) {
              setText(next)

              return
            }
            const result = draft.addValues(option.ref, next)

            setRefused(result.refused)
            setText(result.refused.join(', '))
            if (result.addedRefs.length > 0)
              onAdded(result.addedRefs.at(-1)!)
          }}
        >
          <Input lang="en" placeholder={t('keepsakes.options.addValue.placeholder')} />
        </TextField>
      </div>
      {refused.length > 0 && <QuietNote>{t(refused.length === 1 ? 'keepsakes.options.addValue.alreadyOne' : 'keepsakes.options.addValue.alreadyMany', { values: refused.join(', ') })}</QuietNote>}
    </div>
  )
}
