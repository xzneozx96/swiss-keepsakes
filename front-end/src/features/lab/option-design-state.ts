/**
 * Lab v2 (option designs O1 to O3): the options draft the three designs share. Staged in memory and saved whole, as the
 * real editor does (ADR-027). The rules are the first lab's (keepsake-options-rules.ts, ADR-017); only the starting
 * states and a few edit helpers are new.
 */
import type { OptionDraft, Text, Variant } from './keepsake-options-data'
import type { Assigned, Problem } from './keepsake-options-rules'
import type { DesignState, ProductId } from './option-design-data'

import { useState } from 'react'

import { DEFAULT_SWATCH, keepsakes } from './keepsake-options-data'
import {
  checkOptions,
  codesOf,
  duplicateOf,
  emptyOption,
  hasName,
  labelOf,
  move,
  named,
  newRef,
  plural,
  splitValues,
  variantsUsing,
} from './keepsake-options-rules'

interface Saved { options: OptionDraft[], variants: Variant[] }
interface Refusal { at: string, text: string, detail: string }

/** The value each keepsake refuses to delete in the "delete refused" state: one its variants use. */
const REFUSED: Partial<Record<ProductId, { option: string, value: string }>> = {
  knife: { option: 'size', value: 'size-m' },
  swisscard: { option: 'colour', value: 'col-red' },
}

/** Codes keep their hyphens on one line: VX‑M‑LUCERNE. */
const HYPHENS = /-/g

/** A refused delete in two parts: what happened, then what to do. Calmer than one long sentence. */
function refuseValue(name: string, users: Variant[]): Omit<Refusal, 'at'> {
  return { text: `${name} stays: ${plural(users.length, 'variant')} use it.`, detail: `To delete it, change or archive ${codesOf(users).replace(HYPHENS, '\u2011')} first.` }
}

function refuseOption(name: string, users: Variant[]): Omit<Refusal, 'at'> {
  return { text: `${name} stays: ${plural(users.length, 'variant')} use it.`, detail: 'Every variant has one value of each option, so an option in use can’t be deleted.' }
}

function seed(product: ProductId, state: DesignState) {
  const base = keepsakes[product]
  let options = base.options
  let assigned: Assigned = {}
  let refusal: Refusal | undefined

  if (state === 'new-option' || state === 'errors') {
    const errors = state === 'errors'
    const added: OptionDraft = {
      ref: 'new-option-seed',
      name: errors ? { en: '', de: '' } : { en: 'Finish', de: '' },
      values: [
        { ref: 'new-value-seed-1', label: { en: errors ? 'Red' : 'Matte', de: '' }, swatch: null },
        { ref: 'new-value-seed-2', label: { en: errors ? 'Black' : 'Glossy', de: '' }, swatch: null },
        ...(errors ? [{ ref: 'new-value-seed-3', label: { en: 'red', de: '' }, swatch: null }] : []),
      ],
    }

    options = [...options, added]
    if (errors && base.variants.length > 0)
      assigned = Object.fromEntries(base.variants.slice(0, 2).map(variant => [variant.id, { 'new-option-seed': 'new-value-seed-1' }]))
  }
  const refused = state === 'refused' ? REFUSED[product] : undefined

  if (refused) {
    const value = base.options.find(o => o.ref === refused.option)?.values.find(v => v.ref === refused.value)

    refusal = { at: refused.value, ...refuseValue(labelOf(value?.label ?? {}), variantsUsing(base.variants, refused.option, refused.value)) }
  }

  return { options, assigned, tried: state === 'errors', refusal }
}

/** Names (option and value) that have English but no German yet. German is optional: English shows instead. */
export function missingGerman(options: OptionDraft[]): number {
  return options.reduce((sum, option) => {
    const values = option.values.filter(value => value.label.en.trim() && !value.label.de.trim()).length

    return sum + values + (option.name.en.trim() && !option.name.de.trim() ? 1 : 0)
  }, 0)
}

export function useOptionDesign(product: ProductId, state: DesignState) {
  const [saved, setSaved] = useState<Saved>(() => ({ options: keepsakes[product].options, variants: keepsakes[product].variants }))
  const [draft, setDraft] = useState(() => seed(product, state))
  const [notice, setNotice] = useState('')

  const savedRefs = new Set(saved.options.flatMap(option => [option.ref, ...option.values.map(value => value.ref)]))
  const all = checkOptions(draft.options, savedRefs, saved.variants, draft.assigned)
  // A duplicate shows as soon as it is typed; the rest waits for a refused Save.
  const problems = draft.tried ? all : all.filter(problem => problem.code === 'value-duplicate')
  const dirty = JSON.stringify(draft.options) !== JSON.stringify(saved.options)

  const edit = (change: (options: OptionDraft[]) => OptionDraft[]) => {
    setDraft(current => ({ ...current, options: change(current.options), refusal: undefined }))
    setNotice('')
  }
  const editOption = (ref: string, change: (option: OptionDraft) => OptionDraft) => edit(options => options.map(option => (option.ref === ref ? change(option) : option)))
  const refuse = (refusal: Refusal) => setDraft(current => ({ ...current, refusal }))

  return {
    options: draft.options,
    assigned: draft.assigned,
    variants: saved.variants,
    savedRefs,
    problems,
    problemsAt: (at: string): Problem[] => problems.filter(problem => problem.at === at),
    refusalAt: (at: string) => (draft.refusal?.at === at ? draft.refusal : undefined),
    notice,
    dirty,
    tried: draft.tried,
    isNew: (ref: string) => !savedRefs.has(ref),
    /** The new options that need a value on every variant of a keepsake that has some. */
    needValues: draft.options.filter(option => !savedRefs.has(option.ref) && saved.variants.length > 0 && named(option).length > 0),
    missingGerman: missingGerman(draft.options),

    addOption() {
      const option = emptyOption()

      edit(options => [...options, option])

      return option.ref
    },
    patchName(ref: string, name: Text) {
      editOption(ref, option => ({ ...option, name }))
    },
    removeOption(ref: string) {
      const option = draft.options.find(o => o.ref === ref)
      const users = variantsUsing(saved.variants, ref)

      if (option && savedRefs.has(ref) && users.length > 0) {
        refuse({ at: ref, ...refuseOption(labelOf(option.name) || 'This option', users) })

        return false
      }
      edit(options => options.filter(o => o.ref !== ref))

      return true
    },
    /**
     * Add values from typed or pasted text ("a, b" or lines), at `at` or at the end. Returns the new refs and the words
     * refused as duplicates, so the field can say so.
     */
    addValues(ref: string, input: string, at?: number) {
      const option = draft.options.find(o => o.ref === ref)

      if (!option)
        return { added: [] as string[], refused: [] as string[] }
      const refused: string[] = []
      const added: OptionDraft['values'] = []
      const swatch = option.values.some(v => v.swatch !== null) ? DEFAULT_SWATCH : null

      for (const word of splitValues(input)) {
        if (duplicateOf({ ...option, values: [...option.values, ...added] }, { en: word, de: '' }))
          refused.push(word)
        else
          added.push({ ref: newRef('value'), label: { en: word, de: '' }, swatch })
      }
      if (added.length > 0) {
        editOption(ref, (current) => {
          const values = [...current.values]

          values.splice(at ?? values.length, 0, ...added)

          return { ...current, values }
        })
      }

      return { added: added.map(value => value.ref), refused }
    },
    /** An empty value row (the document design's Enter). Dropped on save if it stays empty. */
    insertBlank(ref: string, at: number) {
      const value = { ref: newRef('value'), label: { en: '', de: '' }, swatch: null as string | null }

      editOption(ref, (option) => {
        const values = [...option.values]

        values.splice(at, 0, { ...value, swatch: option.values.some(v => v.swatch !== null) ? DEFAULT_SWATCH : null })

        return { ...option, values }
      })

      return value.ref
    },
    patchValue(optionRef: string, valueRef: string, patch: { label?: Text, swatch?: string | null }) {
      editOption(optionRef, option => ({ ...option, values: option.values.map(value => (value.ref === valueRef ? { ...value, ...patch } : value)) }))
    },
    removeValue(optionRef: string, valueRef: string) {
      const option = draft.options.find(o => o.ref === optionRef)
      const value = option?.values.find(v => v.ref === valueRef)
      const users = variantsUsing(saved.variants, optionRef, valueRef)

      if (option && value && savedRefs.has(valueRef) && users.length > 0) {
        refuse({ at: valueRef, ...refuseValue(labelOf(value.label) || 'This value', users) })

        return false
      }
      editOption(optionRef, current => ({ ...current, values: current.values.filter(v => v.ref !== valueRef) }))

      return true
    },
    moveValue(optionRef: string, from: number, to: number) {
      editOption(optionRef, option => ({ ...option, values: move(option.values, from, to) }))
    },
    setSwatches(optionRef: string, on: boolean) {
      editOption(optionRef, option => ({ ...option, values: option.values.map(value => ({ ...value, swatch: on ? value.swatch ?? DEFAULT_SWATCH : null })) }))
    },
    assign(variantId: string, optionRef: string, valueRef: string) {
      setDraft(current => ({ ...current, assigned: { ...current.assigned, [variantId]: { ...current.assigned[variantId], [optionRef]: valueRef } } }))
    },
    assignAll(optionRef: string, valueRef: string) {
      setDraft(current => ({
        ...current,
        assigned: { ...current.assigned, ...Object.fromEntries(saved.variants.map(variant => [variant.id, { ...current.assigned[variant.id], [optionRef]: valueRef }])) },
      }))
    },

    /** One save for everything. Refused with the reasons; otherwise the draft becomes the saved options. */
    save() {
      if (all.length > 0) {
        setDraft(current => ({ ...current, tried: true }))

        return false
      }
      const options = draft.options.map(option => ({ ...option, values: option.values.filter(value => hasName(value.label)) }))
      const variants = saved.variants.map(variant => ({
        ...variant,
        values: { ...variant.values, ...Object.fromEntries(options.filter(option => !savedRefs.has(option.ref)).map(option => [option.ref, draft.assigned[variant.id]?.[option.ref] ?? ''])) },
      }))

      setSaved({ options, variants })
      setDraft({ options, assigned: {}, tried: false, refusal: undefined })
      setNotice(variants.length > 0 ? `Saved. All ${plural(variants.length, 'variant')} still have one value of every option.` : 'Saved.')

      return true
    },
    discard() {
      setDraft({ options: saved.options, assigned: {}, tried: false, refusal: undefined })
      setNotice('')
    },
  }
}

export type OptionDesignDraft = ReturnType<typeof useOptionDesign>
