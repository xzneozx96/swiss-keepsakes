import type { OptionDraft, ProductId, Scenario, Text, Variant } from './keepsake-options-data'
/** The options draft the three option designs (A1 to A3) share: staged here, saved whole, as the real sheet does (ADR-027). */
import type { Assigned, Problem } from './keepsake-options-rules'

import { useState } from 'react'

import { DEFAULT_SWATCH, keepsakes } from './keepsake-options-data'
import {
  checkOptions,
  duplicateOf,
  emptyOption,
  hasName,
  labelOf,
  move,
  named,
  newRef,
  plural,
  refuseDeleteOption,
  refuseDeleteValue,
  valueFrom,
  variantsUsing,
} from './keepsake-options-rules'

interface Saved { options: OptionDraft[], variants: Variant[] }
interface Refusal { at: string, text: string }

function seed(product: ProductId, scenario: Scenario) {
  const base = keepsakes[product]
  let options = base.options
  let assigned: Assigned = {}

  if (scenario === 'new-option' || scenario === 'problems') {
    const colour: OptionDraft = {
      ref: 'new-option-seed',
      name: scenario === 'problems' ? { en: '', de: '' } : { en: 'Colour', de: 'Farbe' },
      values: [
        { ref: 'new-value-seed-1', label: { en: 'Red', de: 'Rot' }, swatch: null },
        { ref: 'new-value-seed-2', label: { en: 'Black', de: 'Schwarz' }, swatch: null },
        ...(scenario === 'problems' ? [{ ref: 'new-value-seed-3', label: { en: 'red', de: '' }, swatch: null }] : []),
      ],
    }

    options = [...options, colour]
    if (scenario === 'problems' && base.variants.length > 0) {
      assigned = Object.fromEntries(base.variants.slice(0, 2).map(variant => [variant.id, { 'new-option-seed': 'new-value-seed-1' }]))
    }
  }

  return { options, assigned, tried: scenario === 'problems' }
}

export function useOptionsDraft(product: ProductId, scenario: Scenario) {
  const [saved, setSaved] = useState<Saved>(() => ({ options: keepsakes[product].options, variants: keepsakes[product].variants }))
  const [draft, setDraft] = useState(() => seed(product, scenario))
  const [refusal, setRefusal] = useState<Refusal>()
  const [notice, setNotice] = useState('')

  const savedRefs = new Set(saved.options.flatMap(option => [option.ref, ...option.values.map(value => value.ref)]))
  const all = checkOptions(draft.options, savedRefs, saved.variants, draft.assigned)
  // A duplicate shows as soon as it is typed; the rest waits for a refused Save.
  const problems = draft.tried ? all : all.filter(problem => problem.code === 'value-duplicate')
  const dirty = JSON.stringify(draft.options) !== JSON.stringify(saved.options)

  const edit = (change: (options: OptionDraft[]) => OptionDraft[]) => {
    setDraft(current => ({ ...current, options: change(current.options) }))
    setRefusal(undefined)
    setNotice('')
  }
  const editOption = (ref: string, change: (option: OptionDraft) => OptionDraft) => edit(options => options.map(option => (option.ref === ref ? change(option) : option)))

  const problemsAt = (at: string): Problem[] => problems.filter(problem => problem.at === at)

  return {
    options: draft.options,
    assigned: draft.assigned,
    variants: saved.variants,
    savedRefs,
    problems,
    problemsAt,
    refusal,
    refusalAt: (at: string) => (refusal?.at === at ? refusal.text : undefined),
    notice,
    dirty,
    tried: draft.tried,
    isNew: (ref: string) => !savedRefs.has(ref),
    /** The new options that need a value on every variant of a keepsake that has some. */
    needValues: draft.options.filter(option => !savedRefs.has(option.ref) && saved.variants.length > 0 && named(option).length > 0),

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
        setRefusal({ at: ref, text: refuseDeleteOption(labelOf(option.name) || 'this option', users) })

        return
      }
      edit(options => options.filter(o => o.ref !== ref))
    },
    /** Add values from typed text. Returns the words refused as duplicates, so the field can say so. */
    addValues(ref: string, words: string[], lang: 'en' | 'de' = 'en', swatch: string | null = null) {
      const option = draft.options.find(o => o.ref === ref)

      if (!option)
        return []
      const refused: string[] = []
      const kept = [...option.values]

      for (const word of words) {
        const text: Text = { en: lang === 'en' ? word : '', de: lang === 'de' ? word : '' }

        if (duplicateOf({ ...option, values: kept }, text))
          refused.push(word)
        else
          kept.push(valueFrom(word, lang, swatch))
      }
      if (kept.length !== option.values.length)
        editOption(ref, current => ({ ...current, values: kept }))

      return refused
    },
    /** One new value with both texts at once (the table's empty last row). True when it was refused as a duplicate. */
    addValueText(ref: string, label: Text) {
      const option = draft.options.find(o => o.ref === ref)

      if (!option || duplicateOf(option, label))
        return option !== undefined

      editOption(ref, current => ({ ...current, values: [...current.values, { ref: newRef('value'), label, swatch: current.values.some(v => v.swatch !== null) ? DEFAULT_SWATCH : null }] }))

      return false
    },
    patchValue(optionRef: string, valueRef: string, patch: { label?: Text, swatch?: string | null }) {
      editOption(optionRef, option => ({ ...option, values: option.values.map(value => (value.ref === valueRef ? { ...value, ...patch } : value)) }))
    },
    removeValue(optionRef: string, valueRef: string) {
      const option = draft.options.find(o => o.ref === optionRef)
      const value = option?.values.find(v => v.ref === valueRef)
      const users = variantsUsing(saved.variants, optionRef, valueRef)

      if (option && value && savedRefs.has(valueRef) && users.length > 0) {
        setRefusal({ at: valueRef, text: refuseDeleteValue(labelOf(value.label) || 'this value', users) })

        return
      }
      editOption(optionRef, current => ({ ...current, values: current.values.filter(v => v.ref !== valueRef) }))
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
      setDraft({ options, assigned: {}, tried: false })
      setRefusal(undefined)
      setNotice(`Options saved. ${plural(variants.length, 'variant')} checked.`)

      return true
    },
    discard() {
      setDraft({ options: saved.options, assigned: {}, tried: false })
      setRefusal(undefined)
      setNotice('')
    },
  }
}

export type OptionsDraft = ReturnType<typeof useOptionsDraft>
