import type { Keepsake, OptionValue, ProductOption, Sku } from './keepsake-editor-data'
import type { OptionsProblem } from './keepsake-editor-rules'

import { Button, Input, Label, Switch, TextField, toast } from '@heroui/react'
import { useEffect, useRef, useState } from 'react'

import { GripIcon, PlusIcon, StatusDangerIcon, TrashIcon } from '@/components/icons'
import { SheetFrame } from '@/components/sheet-frame'
import { useStopDrag } from '@/hooks/use-stop-drag'
import { colourOption } from './keepsake-editor-data'
import { combinationName, deleteOptionRefusal, deleteValueRefusal, emptyOption, emptyValue, label, optionsProblems } from './keepsake-editor-rules'
import { SkuThumb, Swatch, ValuePicker } from './keepsake-editor-sku'

/**
 * The options sheet N14: options, their ordered values (with a colour swatch where it helps),
 * and, when an option is new, a value of it for every existing SKU. All of it is staged here and
 * saves in one go, because the database counts each SKU's values against the options at commit
 * (ADR-027). A value or an option that a SKU uses can't be deleted; the refusal names the SKUs.
 */

let seed = 0
const newId = (prefix: string) => `${prefix}-${++seed}`

/** `new`: the sheet opens on a new, empty option (the Options card's Add). */
export type OptionsStart = 'addoption' | 'inuse' | 'new'

/** Where the options come from and go to: a saved product (N14 on the product page) or the create flow's draft. */
export interface OptionsSource {
  product: Pick<Keepsake, 'options' | 'skus'>
  saveOptions: (options: ProductOption[], skus: Sku[]) => OptionsProblem[]
}

/** Each SKU's value of each new option, staged until Save: SKU id → option id → value id. */
type Assigned = Record<string, Record<string, string>>

/** What the lab states open on: Colour being added, or the refused delete of a used value. */
function startDraft(model: OptionsSource, start?: OptionsStart): { options: ProductOption[], assigned: Assigned } {
  const options = structuredClone(model.product.options)
  const assigned: Assigned = {}

  if (start === 'addoption') {
    options.push(structuredClone(colourOption))
    // Eight of ten SKUs have a colour; two still need one, so Save is refused until they do.
    model.product.skus.slice(0, 8).forEach((s, i) => {
      assigned[s.id] = { [colourOption.id]: i % 3 === 2 ? 'v-black' : 'v-red' }
    })
  }

  if (start === 'new')
    options.push({ ...emptyOption(newId('opt-new')), values: [emptyValue(newId('v-new'))] })

  return { options, assigned }
}

const without = (values: Record<string, string>, key: string) => Object.fromEntries(Object.entries(values).filter(([k]) => k !== key))

/**
 * The staged options (N14). Only the options and the new options' values per SKU are staged; the
 * SKUs themselves stay the saved ones, so a variant edited meanwhile (option B's matrix) is never
 * written back stale. Save sends both in one write.
 */
export function useOptionsDraft(model: OptionsSource, start?: OptionsStart) {
  const [draft, setDraft] = useState(() => startDraft(model, start))
  const { options, assigned } = draft
  const skus = model.product.skus.map(s => (assigned[s.id] ? { ...s, values: { ...s.values, ...assigned[s.id] } } : s))
  // The add-option state opens as if Save was pressed once: two SKUs still need a colour.
  const [problems, setProblems] = useState<OptionsProblem[]>(() => (start === 'addoption' ? optionsProblems(options, skus) : []))
  const [refusal, setRefusal] = useState<{ at: string, text: string } | null>(() => {
    const text = start === 'inuse' ? deleteValueRefusal(model.product.skus, 'opt-theme', 'v-lion') : undefined

    return text ? { at: 'v-lion', text } : null
  })
  const savedIds = new Set(model.product.options.map(o => o.id))
  // A new option asks for a value per SKU only once one of its values has a name to pick.
  const newOptions = options.filter(o => !savedIds.has(o.id) && o.values.some(v => label(v.label)))
  const dirty = Object.keys(assigned).length > 0 || JSON.stringify(options) !== JSON.stringify(model.product.options)

  const setOptions = (next: (o: ProductOption[]) => ProductOption[]) => {
    setDraft(d => ({ ...d, options: next(d.options) }))
    setRefusal(null)
  }
  const patchOption = (id: string, patch: Partial<ProductOption>) => setOptions(os => os.map(o => (o.id === id ? { ...o, ...patch } : o)))
  const patchValue = (optionId: string, valueId: string, patch: Partial<OptionValue>) =>
    setOptions(os => os.map(o => (o.id === optionId ? { ...o, values: o.values.map(v => (v.id === valueId ? { ...v, ...patch } : v)) } : o)))
  const assign = (skuIds: string[], optionId: string, valueId: string) => setDraft(d => ({
    ...d,
    assigned: { ...d.assigned, ...Object.fromEntries(skuIds.map(id => [id, { ...d.assigned[id], [optionId]: valueId }])) },
  }))

  return {
    options,
    skus,
    problems,
    refusal,
    dirty,
    newOptions,
    savedIds,
    patchOption,
    patchValue,
    addOption: () => {
      const id = newId('opt-new')

      setOptions(os => [...os, { ...emptyOption(id), values: [emptyValue(newId('v-new'))] }])

      return id
    },
    removeOption: (id: string) => {
      const text = deleteOptionRefusal(model.product.skus, id)

      if (text) {
        setRefusal({ at: id, text })

        return
      }
      setDraft(d => ({
        options: d.options.filter(o => o.id !== id),
        assigned: Object.fromEntries(Object.entries(d.assigned).map(([sku, values]) => [sku, without(values, id)]).filter(([, values]) => Object.keys(values as object).length)),
      }))
      setRefusal(null)
    },
    /** A new value at the end; `en` names it at once (option B's chip input). */
    addValue: (optionId: string, en = '') => {
      const option = options.find(o => o.id === optionId)
      const value = { ...emptyValue(newId('v-new'), option?.values.some(v => v.swatch) ? '#888888' : null), label: { en, de: '' } }

      setOptions(os => os.map(o => (o.id === optionId ? { ...o, values: [...o.values, value] } : o)))
    },
    removeValue: (optionId: string, valueId: string) => {
      const text = deleteValueRefusal(model.product.skus, optionId, valueId)

      if (text) {
        setRefusal({ at: valueId, text })

        return
      }
      setDraft(d => ({
        options: d.options.map(o => (o.id === optionId ? { ...o, values: o.values.filter(v => v.id !== valueId) } : o)),
        assigned: Object.fromEntries(Object.entries(d.assigned).map(([sku, values]) => [sku, values[optionId] === valueId ? without(values, optionId) : values])),
      }))
      setRefusal(null)
    },
    moveValue: (optionId: string, from: number, to: number) => setOptions(os => os.map((o) => {
      if (o.id !== optionId)
        return o
      const values = [...o.values]
      const [moved] = values.splice(from, 1)

      values.splice(to, 0, moved!)

      return { ...o, values }
    })),
    setSkuValue: (skuId: string, optionId: string, valueId: string) => assign([skuId], optionId, valueId),
    setAll: (optionId: string, valueId: string) => assign(model.product.skus.map(s => s.id), optionId, valueId),
    /** One save: the options and every SKU's values, or the problems. */
    save: () => {
      const found = model.saveOptions(options, skus)

      setProblems(found)
      if (!found.length)
        setDraft(d => ({ ...d, assigned: {} }))

      return found.length === 0
    },
    reset: () => {
      setDraft({ options: structuredClone(model.product.options), assigned: {} })
      setProblems([])
      setRefusal(null)
    },
  }
}

export type OptionsDraft = ReturnType<typeof useOptionsDraft>

export function Refusal({ text }: { text: string }) {
  return (
    <p className="flex items-start gap-2 rounded-2xl bg-danger-soft p-3 text-sm text-pretty text-danger-soft-foreground" role="alert">
      <StatusDangerIcon aria-hidden className="mt-0.5 shrink-0" size={16} />
      <span>{text}</span>
    </p>
  )
}

function ProblemText({ problems, at }: { problems: OptionsProblem[], at: string }) {
  const mine = problems.filter(p => p.at === at)

  return mine.length ? <p className="text-sm text-danger" role="alert">{mine.map(p => p.text).join(' ')}</p> : null
}

/** One option's values, in order, dragged by the grip (or moved with the arrow keys), as M17's lists. */
function ValueRows({ option, draft }: { option: ProductOption, draft: OptionsDraft }) {
  const listRef = useRef<HTMLOListElement>(null)
  const placeholderRef = useRef<HTMLDivElement>(null)
  const refocusRef = useRef<string | null>(null)
  const swatches = option.values.some(v => v.swatch !== null)
  const moveTo = (from: number, to: number) => {
    if (to < 0 || to >= option.values.length || to === from)
      return
    refocusRef.current = option.values[from]!.id
    draft.moveValue(option.id, from, to)
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
      <ol ref={listRef} aria-label={`${label(option.name) || 'Option'} values, in order`} className="flex flex-col gap-2">
        {option.values.map((v, index) => {
          const name = label(v.label) || `Value ${index + 1}`

          return (
            <li key={v.id} className="group" data-row={v.id}>
              {/* One block per value: the header row holds the grip, swatch, name and delete; the
                  names stack full width below, so nothing sits beside an input on a phone. */}
              <div className="flex flex-col gap-2 rounded-2xl bg-surface-secondary p-2 group-data-[lifted]:bg-surface group-data-[lifted]:shadow-overlay lg:p-3">
                <div className="flex min-w-0 items-center gap-1">
                  <button
                    {...drag.handleProps(index)}
                    aria-label={`Move ${name}, position ${index + 1} of ${option.values.length}. Drag, or use the arrow keys.`}
                    className="relative grid size-11 shrink-0 cursor-grab place-items-center rounded-full text-muted outline-none focus-visible:focus-ring active:cursor-grabbing"
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
                  {swatches && (
                    <label className="relative grid size-11 shrink-0 cursor-pointer place-items-center rounded-full outline-none focus-within:focus-ring">
                      <span className="sr-only">{`Colour of ${name}`}</span>
                      <Swatch className="size-7" color={v.swatch ?? '#888888'} />
                      <input className="absolute inset-0 cursor-pointer opacity-0" type="color" value={v.swatch ?? '#888888'} onChange={e => draft.patchValue(option.id, v.id, { swatch: e.target.value.toLowerCase() })} />
                    </label>
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{name}</span>
                  <Button isIconOnly aria-label={`Delete ${name}`} className="size-11 shrink-0 lg:size-10" variant="danger-soft" onPress={() => draft.removeValue(option.id, v.id)}>
                    <TrashIcon aria-hidden size={16} />
                  </Button>
                </div>
                {/* minmax(0, 1fr): an implicit auto column would grow to the input's intrinsic width. */}
                <div className="grid grid-cols-[minmax(0,1fr)] gap-2 px-1 pb-1 lg:grid-cols-2">
                  {(['en', 'de'] as const).map(l => (
                    <TextField key={l} fullWidth value={v.label[l]} onChange={text => draft.patchValue(option.id, v.id, { label: { ...v.label, [l]: text } })}>
                      <Label className="text-xs">{l === 'en' ? 'English' : 'German (optional)'}</Label>
                      <Input lang={l} placeholder={l === 'de' ? 'Deutsch' : 'English'} />
                    </TextField>
                  ))}
                </div>
                {draft.refusal?.at === v.id && <Refusal text={`Can’t delete ${name}. ${draft.refusal.text}`} />}
                <ProblemText at={v.id} problems={draft.problems} />
              </div>
            </li>
          )
        })}
      </ol>
      <div ref={placeholderRef} aria-hidden hidden className="pointer-events-none absolute inset-x-0 rounded-2xl border-2 border-dashed border-accent bg-accent/10" />
    </div>
  )
}

/** One option: a header row with its name and delete, the names full width, swatches on or off, its values. */
export function OptionBlock({ option, draft }: { option: ProductOption, draft: OptionsDraft }) {
  const swatches = option.values.some(v => v.swatch !== null)
  const name = label(option.name) || 'New option'

  return (
    <section aria-label={name} className="flex flex-col gap-3 rounded-2xl border border-separator p-3 lg:p-4">
      <div className="flex min-w-0 items-center gap-2">
        <h3 className="min-w-0 flex-1 truncate text-base font-semibold">{name}</h3>
        <Button isIconOnly aria-label={`Delete the option ${name}`} className="size-11 shrink-0 lg:size-10" variant="danger-soft" onPress={() => draft.removeOption(option.id)}>
          <TrashIcon aria-hidden size={16} />
        </Button>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2">
        {(['en', 'de'] as const).map(l => (
          <TextField key={l} fullWidth value={option.name[l]} onChange={text => draft.patchOption(option.id, { name: { ...option.name, [l]: text } })}>
            <Label>{l === 'en' ? 'Option name (English)' : 'Option name (German)'}</Label>
            <Input lang={l} placeholder={l === 'en' ? 'Size, Theme, Colour…' : 'Grösse, Motiv, Farbe…'} />
          </TextField>
        ))}
      </div>
      {draft.refusal?.at === option.id && <Refusal text={`Can’t delete ${name}. ${draft.refusal.text}`} />}
      <ProblemText at={option.id} problems={draft.problems} />
      <Switch
        className="min-h-11"
        isSelected={swatches}
        onChange={on => draft.patchOption(option.id, { values: option.values.map(v => ({ ...v, swatch: on ? v.swatch ?? '#888888' : null })) })}
      >
        <Switch.Content className="items-center">
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          <Label className="text-sm">Show a colour swatch for each value</Label>
        </Switch.Content>
      </Switch>
      <ValueRows draft={draft} option={option} />
      <Button className="self-start max-lg:h-11" size="sm" variant="secondary" onPress={() => draft.addValue(option.id)}>
        <PlusIcon aria-hidden size={16} />
        Add a value
      </Button>
    </section>
  )
}

/**
 * A new option needs a value on every SKU in the same save (archived ones too: the database
 * counts them all). "All" fills every SKU at once; each row can then differ.
 */
export function AssignValues({ draft }: { draft: OptionsDraft }) {
  if (!draft.skus.length)
    return null

  return (
    <>
      {draft.newOptions.map((option) => {
        const name = label(option.name).toLowerCase() || 'value'
        const missing = draft.skus.filter(s => !option.values.some(v => v.id === s.values[option.id])).length

        return (
          <section key={option.id} aria-label={`A ${name} for every variant`} className="flex flex-col gap-3 rounded-2xl bg-surface-secondary p-3 lg:p-4">
            <div className="flex flex-col gap-0.5">
              <h3 className="text-sm font-semibold">{`A ${name} for each of your ${draft.skus.length} variants`}</h3>
              <p className="text-sm text-pretty text-muted">
                {`Every variant needs one, in this save. ${missing ? `${missing} still ${missing === 1 ? 'needs' : 'need'} one.` : 'All set.'}`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">Give all:</span>
              {option.values.filter(v => label(v.label)).map(v => (
                <Button key={v.id} className="max-lg:h-11" size="sm" variant="secondary" onPress={() => draft.setAll(option.id, v.id)}>
                  <Swatch color={v.swatch} />
                  {label(v.label)}
                </Button>
              ))}
            </div>
            <ul className="flex flex-col divide-y divide-separator">
              {draft.skus.map((s: Sku) => (
                // Stacked at every width: the sheet is 560px wide, so a side-by-side row left the chips ~200px.
                <li key={s.id} className="flex flex-col gap-2 py-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <SkuThumb options={draft.options} sku={s} />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-mono text-sm">{s.code}</span>
                      <span className="truncate text-xs text-muted">{`${combinationName(s.values, draft.options.filter(o => o.id !== option.id))}${s.status === 'archived' ? ' · archived' : ''}`}</span>
                    </span>
                  </span>
                  <div className="min-w-0 lg:ps-13 [&_[data-slot=label]]:sr-only">
                    <ValuePicker option={option} size="sm" value={s.values[option.id]} onChange={v => draft.setSkuValue(s.id, option.id, v)} />
                    <ProblemText at={s.id} problems={draft.problems} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </>
  )
}

export function OptionsProblems({ draft }: { draft: OptionsDraft }) {
  return draft.problems.length > 0
    ? <Refusal text={`Not saved. ${draft.problems.length} ${draft.problems.length === 1 ? 'thing needs' : 'things need'} a fix: ${draft.problems.map(p => p.text).join(' ')}`} />
    : null
}

/** The N14 body: the options in focus (one, or the new ones), Add an option, and the values new options need. */
export function OptionsEditor({ draft, focus, canAdd = true }: { draft: OptionsDraft, focus?: string, canAdd?: boolean }) {
  const shown = focus ? draft.options.filter(o => o.id === focus || !draft.savedIds.has(o.id)) : draft.options

  return (
    <div className="flex flex-col gap-4">
      {shown.map(o => <OptionBlock key={o.id} draft={draft} option={o} />)}
      {!draft.options.length && <p className="text-sm text-pretty text-muted">No options: this keepsake is sold as one variant. Add one for sizes, themes, colours or anything else.</p>}
      {canAdd && (
        <Button className="self-start max-lg:h-11" variant="secondary" onPress={draft.addOption}>
          <PlusIcon aria-hidden size={16} />
          Add an option
        </Button>
      )}
      <AssignValues draft={draft} />
    </div>
  )
}

/**
 * N14 in the shared sheet, from the product page: one option's values, order and swatches (⋯ on
 * its row), or a new option with a value for every variant (Add option). Save is one write.
 */
export function OptionsSheet({ model, focus, start, onClose }: { model: OptionsSource, focus?: string, start?: OptionsStart, onClose: () => void }) {
  const draft = useOptionsDraft(model, start)
  const focused = draft.options.find(o => o.id === focus)

  return (
    <SheetFrame
      isOpen
      footer={(
        <>
          <Button
            fullWidth
            isDisabled={!draft.dirty}
            onPress={() => {
              if (draft.save()) {
                toast.success('Options saved.')
                onClose()
              }
            }}
          >
            Save options
          </Button>
          <Button fullWidth variant="tertiary" onPress={onClose}>Cancel</Button>
        </>
      )}
      title={focused ? `Edit ${label(focused.name) || 'option'}` : 'Add an option'}
      onClose={onClose}
    >
      <p className="text-sm text-pretty text-muted">
        {focused
          ? 'Values in the order guests see them. German names are optional; without one, German readers see the English.'
          : 'Name it, add its values, and give every existing variant one of them. It all saves together.'}
      </p>
      <OptionsProblems draft={draft} />
      <OptionsEditor canAdd={false} draft={draft} focus={focus ?? 'new'} />
    </SheetFrame>
  )
}
