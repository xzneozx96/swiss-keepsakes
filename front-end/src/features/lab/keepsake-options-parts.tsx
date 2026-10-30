/** Pieces the lab designs share: the reorder list, the colour picker, the chip choice, the "a value for every variant" panel and the save bar. */
import type { ReactNode } from 'react'
import type { OptionDraft, ValueDraft } from './keepsake-options-data'
import type { OptionsDraft } from './keepsake-options-state'

import { Button, Label, Popover, Tag, TagGroup } from '@heroui/react'
import { useEffect, useRef, useState } from 'react'

import { GripIcon, SelectedIcon, StatusWarningIcon } from '@/components/icons'
import { RefusalAlert, Swatch } from '@/features/keepsakes/components/option-parts'
import { useStopDrag } from '@/hooks/use-stop-drag'
import { DEFAULT_SWATCH } from './keepsake-options-data'
import { combinationName, labelOf, named, plural, unassigned } from './keepsake-options-rules'

const PRESETS: [string, string][] = [
  ['Red', '#c8102e'],
  ['Black', '#1a1a1a'],
  ['White', '#f5f5f5'],
  ['Navy', '#1f3a5f'],
  ['Green', '#2f7d4f'],
  ['Yellow', '#f2c230'],
  ['Brown', '#8a5a2b'],
  ['Grey', DEFAULT_SWATCH],
]

/**
 * Rows in order: a grip drags the row (pointer, touch or pen), the arrow keys on the grip move it one step and keep the
 * focus, and a live region says where it went. The app's reorder pattern (photo-order, useStopDrag).
 */
export function Reorder<T extends { ref: string }>({ items, label, nameOf, onMove, row, rowClass = '' }: {
  items: T[]
  label: string
  nameOf: (item: T) => string
  onMove: (from: number, to: number) => void
  row: (item: T, index: number, grip: ReactNode) => ReactNode
  rowClass?: string
}) {
  const listRef = useRef<HTMLOListElement>(null)
  const placeholderRef = useRef<HTMLDivElement>(null)
  const refocusRef = useRef<string | null>(null)
  const [announcement, setAnnouncement] = useState('')

  const moveTo = (from: number, to: number) => {
    if (to < 0 || to >= items.length || to === from)
      return
    refocusRef.current = items[from]!.ref
    onMove(from, to)
    setAnnouncement(`${nameOf(items[from]!)} moved to position ${to + 1} of ${items.length}.`)
  }
  const drag = useStopDrag({ listRef, placeholderRef, onStart: () => undefined, onDrop: moveTo })

  useEffect(() => {
    if (!refocusRef.current)
      return
    listRef.current?.querySelector<HTMLButtonElement>(`[data-row="${refocusRef.current}"] [data-grip]`)?.focus()
    refocusRef.current = null
  })

  const grip = (item: T, index: number) => (
    <button
      {...drag.handleProps(index)}
      aria-label={`Move ${nameOf(item)}. Position ${index + 1} of ${items.length}. Use the up and down arrow keys.`}
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
  )

  return (
    <div className="relative">
      <ol ref={listRef} aria-label={label} className="flex flex-col">
        {items.map((item, index) => (
          <li key={item.ref} className="group" data-row={item.ref}>
            <div className={`flex items-center gap-1 rounded-2xl group-data-[lifted]:bg-surface group-data-[lifted]:shadow-overlay ${rowClass}`}>
              {row(item, index, grip(item, index))}
            </div>
          </li>
        ))}
      </ol>
      <div ref={placeholderRef} aria-hidden hidden className="pointer-events-none absolute inset-x-0 rounded-2xl border-2 border-dashed border-accent bg-accent/10" />
      <p aria-live="polite" className="sr-only" role="status">{announcement}</p>
    </div>
  )
}

/** A colour for a value: eight presets with names, and any colour from the browser's picker. */
export function SwatchPicker({ value, name, onChange, size = 'size-7' }: { value: string | null, name: string, onChange: (swatch: string | null) => void, size?: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Popover isOpen={isOpen} onOpenChange={setIsOpen}>
      <Button isIconOnly aria-label={`Colour of ${name}${value ? `: ${value}` : ': none'}`} className="size-11 shrink-0 rounded-full lg:size-9" variant="ghost">
        {value
          ? <Swatch className={size} color={value} />
          : <span aria-hidden className={`${size} rounded-full border-2 border-dashed border-muted/60`} />}
      </Button>
      <Popover.Content className="w-60" placement="bottom start">
        <Popover.Dialog aria-label={`Colour of ${name}`} className="flex flex-col gap-3 p-3">
          <div className="grid grid-cols-4 gap-1">
            {PRESETS.map(([label, hex]) => (
              <button
                key={hex}
                aria-label={label}
                aria-pressed={value === hex}
                className="grid h-11 place-items-center rounded-xl outline-none hover:bg-default focus-visible:focus-ring aria-pressed:bg-default"
                type="button"
                onClick={() => { onChange(hex); setIsOpen(false) }}
              >
                <Swatch className="size-6" color={hex} />
              </button>
            ))}
          </div>
          <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
            Any colour
            <input className="size-9 cursor-pointer rounded-lg border border-separator bg-transparent p-0.5" type="color" value={value ?? DEFAULT_SWATCH} onChange={event => onChange(event.target.value.toLowerCase())} />
          </label>
          <Button isDisabled={value === null} size="sm" variant="tertiary" onPress={() => { onChange(null); setIsOpen(false) }}>No colour</Button>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  )
}

const CHOICE_TAG = 'group relative h-auto min-h-11 items-center justify-start gap-2 rounded-2xl border-2 border-transparent px-3 py-2 before:hidden data-[selected=true]:border-accent data-[selected=true]:bg-default data-[selected=true]:hover:bg-default-hover lg:min-h-10'

/** One value of one option as chips in the app's selected style (a red border and the mark). */
export function ChoiceChips({ label, values, value, onChange, hideLabel = false, disabledKeys }: {
  label: string
  values: ValueDraft[]
  value: string | undefined
  onChange: (ref: string) => void
  hideLabel?: boolean
  disabledKeys?: string[]
}) {
  return (
    <TagGroup
      aria-label={label}
      disabledKeys={disabledKeys}
      selectedKeys={value ? new Set([value]) : new Set()}
      selectionMode="single"
      size="lg"
      onSelectionChange={(keys) => {
        const [first] = keys === 'all' ? [] : Array.from(keys, String)

        if (first)
          onChange(first)
      }}
    >
      <Label className={hideLabel ? 'sr-only' : 'text-sm font-medium'}>{label}</Label>
      <TagGroup.List className="flex flex-wrap gap-2">
        {values.map(v => (
          <Tag key={v.ref} className={CHOICE_TAG} id={v.ref} textValue={labelOf(v.label)}>
            <Swatch color={v.swatch} />
            <span className="font-medium">{labelOf(v.label)}</span>
            <SelectedIcon aria-hidden className="absolute -end-1 -top-1 hidden size-4.5 rounded-full bg-surface text-accent group-data-[selected=true]:block" weight="Filled" />
          </Tag>
        ))}
      </TagGroup.List>
    </TagGroup>
  )
}

/**
 * A new option on a keepsake that already has variants: every variant needs one of its values, hidden ones too, in the
 * same save. "Give all" fills the lot; each row can then differ. Rows that still need a value say so in words.
 */
export function AssignVariants({ draft, option }: { draft: OptionsDraft, option: OptionDraft }) {
  const name = labelOf(option.name) || 'new option'
  const values = named(option)
  const others = draft.options.filter(o => o.ref !== option.ref && draft.savedRefs.has(o.ref))
  const missing = unassigned(option, draft.variants, draft.assigned)
  const missingIds = new Set(missing.map(variant => variant.id))
  const problem = draft.problemsAt(`${option.ref}:assign`)[0]

  return (
    <section aria-label={`A ${name.toLowerCase()} for each of your ${draft.variants.length} variants`} className="flex flex-col gap-3 rounded-2xl bg-surface-secondary p-3 lg:p-4" data-testid="assign-variants">
      <div className="flex flex-col gap-0.5">
        <h4 className="text-sm font-semibold">{`A ${name.toLowerCase()} for each of your ${draft.variants.length} variants`}</h4>
        <p className="text-sm text-pretty text-muted">Every variant has one value of every option, hidden ones too. Fill them all at once, then change single rows.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">Give all</span>
        {values.map(value => (
          <Button key={value.ref} className="max-lg:h-11" size="sm" variant="secondary" onPress={() => draft.assignAll(option.ref, value.ref)}>
            <Swatch color={value.swatch} />
            {labelOf(value.label)}
          </Button>
        ))}
        <span aria-live="polite" className={`ms-auto flex items-center gap-1.5 text-sm tabular-nums ${missing.length > 0 ? 'text-warning' : 'text-success'}`}>
          {missing.length > 0 && <StatusWarningIcon aria-hidden size={14} />}
          {missing.length > 0 ? `${draft.variants.length - missing.length} of ${draft.variants.length} set` : 'All set'}
        </span>
      </div>
      <ul className="flex flex-col divide-y divide-separator">
        {draft.variants.map(variant => (
          <li key={variant.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
            <span className="flex flex-col">
              <span className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-sm">{variant.code}</span>
                {missingIds.has(variant.id) && <span className="shrink-0 text-xs text-warning">Needs a value</span>}
              </span>
              <span className="text-xs text-muted">{`${combinationName(variant.values, others)}${variant.status === 'hidden' ? ' · hidden' : ''}`}</span>
            </span>
            <ChoiceChips hideLabel label={`${name} of ${variant.code}`} value={draft.assigned[variant.id]?.[option.ref]} values={values} onChange={ref => draft.assign(variant.id, option.ref, ref)} />
          </li>
        ))}
      </ul>
      {problem && <p className="text-sm text-danger" role="alert">{`${problem.text}`}</p>}
    </section>
  )
}

/** The bar under inline editing: what is unsaved, Discard and Save. Options never autosave (ADR-027). */
export function DraftBar({ draft }: { draft: OptionsDraft }) {
  const count = draft.problems.filter(problem => problem.code !== 'value-duplicate').length

  return (
    <div className="flex flex-col gap-2 border-t border-separator pt-4" data-testid="draft-bar">
      {draft.tried && count > 0 && (
        <p className="text-sm text-pretty text-danger" role="alert">
          {`Not saved. ${plural(count, 'thing')} to fix: ${draft.problems.filter(problem => problem.code !== 'value-duplicate').map(problem => problem.text).join(' ')}`}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <p aria-live="polite" className="me-auto text-sm text-muted" role="status">
          {draft.dirty ? 'Changes not saved yet' : draft.notice || 'Saved'}
        </p>
        <Button className="max-lg:h-11" isDisabled={!draft.dirty} variant="tertiary" onPress={draft.discard}>Discard</Button>
        <Button className="max-lg:h-11" isDisabled={!draft.dirty} onPress={() => draft.save()}>Save options</Button>
      </div>
    </div>
  )
}

/** What stops a save at one place: a refused delete (an alert) and the rules' texts. */
export function ProblemLines({ draft, at }: { draft: OptionsDraft, at: string }) {
  const problems = draft.problemsAt(at)
  const refusal = draft.refusalAt(at)

  return (
    <>
      {refusal && <RefusalAlert>{refusal}</RefusalAlert>}
      {problems.map(problem => <p key={problem.text} className="text-sm text-danger" role="alert">{problem.text}</p>)}
    </>
  )
}
