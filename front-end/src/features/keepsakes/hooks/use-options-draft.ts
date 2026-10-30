import type { ProductOption } from '@sk/api-contract'
import type { OptionDraft, Refusal, Valued, ValueDraft, Values } from '../lib/option-rules'

import { useState } from 'react'

import { checkOptionsDraft, DEFAULT_SWATCH, draftOfOptions, emptyText, labelOf, newOption, variantsUsing } from '../lib/option-rules'

/** Each variant's value of each option, staged until Save: variant id, then option ref, then value ref. */
type Assigned = Record<string, Values>

interface Draft { options: OptionDraft[], assigned: Assigned }

const newRef = () => crypto.randomUUID()

const without = (values: Values, key: string) => Object.fromEntries(Object.entries(values).filter(([k]) => k !== key))

const hasName = (value: ValueDraft) => labelOf(value.label) !== ''

/**
 * The options as the options sheet N14 and the create flow stage them (design section 5). Only the options and the new
 * values of the variants are staged, so a variant edited meanwhile is never written back stale. Nothing is saved here:
 * `problems` is what the rules say when the merchant presses Save, and a delete that a variant forbids is refused where
 * the merchant presses it (`refusal`).
 */
export function useOptionsDraft({ saved, variants, startNew = false }: { saved: ProductOption[], variants: Valued[], startNew?: boolean }) {
  const [draft, setDraft] = useState<Draft>(() => ({
    options: [...draftOfOptions(saved), ...(startNew ? [newOption(newRef(), newRef())] : [])],
    assigned: {},
  }))
  const [problems, setProblems] = useState<Refusal[]>([])
  const [refusal, setRefusal] = useState<Refusal>()
  const { options, assigned } = draft
  const savedIds = new Set(saved.map(option => option.id))
  const staged = variants.map(variant => (assigned[variant.id] ? { ...variant, values: { ...variant.values, ...assigned[variant.id] } } : variant))
  // A new option asks for a value per variant only once one of its values has a name to pick.
  const newOptions = options.filter(option => !savedIds.has(option.ref) && option.values.some(hasName))
  const savedJson = JSON.stringify(draftOfOptions(saved))
  const dirty = Object.keys(assigned).length > 0 || JSON.stringify(options) !== savedJson

  const setOptions = (next: (options: OptionDraft[]) => OptionDraft[]) => {
    setDraft(d => ({ ...d, options: next(d.options) }))
    setRefusal(undefined)
    setProblems([])
  }
  const assign = (variantIds: string[], optionRef: string, valueRef: string) => {
    setDraft(d => ({ ...d, assigned: { ...d.assigned, ...Object.fromEntries(variantIds.map(id => [id, { ...d.assigned[id], [optionRef]: valueRef }])) } }))
    setProblems([])
  }

  return {
    options,
    variants: staged,
    problems,
    refusal,
    dirty,
    newOptions,
    savedIds,
    assigned,
    patchOption: (ref: string, patch: Partial<OptionDraft>) => setOptions(list => list.map(option => (option.ref === ref ? { ...option, ...patch } : option))),
    patchValue: (optionRef: string, valueRef: string, patch: Partial<ValueDraft>) =>
      setOptions(list => list.map(option => (option.ref === optionRef ? { ...option, values: option.values.map(value => (value.ref === valueRef ? { ...value, ...patch } : value)) } : option))),
    addOption: () => setOptions(list => [...list, newOption(newRef(), newRef())]),
    removeOption: (ref: string) => {
      const users = variantsUsing(variants, ref)
      const option = options.find(o => o.ref === ref)

      if (users.length > 0 && savedIds.has(ref)) {
        setRefusal({ at: ref, code: 'option-in-use', params: { option: labelOf(option?.name ?? emptyText()), count: users.length, codes: users.slice(0, 3).map(u => u.skuCode).join(', '), more: Math.max(0, users.length - 3) } })

        return
      }
      setDraft(d => ({ options: d.options.filter(o => o.ref !== ref), assigned: Object.fromEntries(Object.entries(d.assigned).map(([id, values]) => [id, without(values, ref)]).filter(([, values]) => Object.keys(values as Values).length > 0)) }))
      setRefusal(undefined)
      setProblems([])
    },
    addValue: (optionRef: string) => {
      const option = options.find(o => o.ref === optionRef)
      const value: ValueDraft = { ref: newRef(), label: emptyText(), swatch: option?.values.some(v => v.swatch !== null) ? DEFAULT_SWATCH : null }

      setOptions(list => list.map(o => (o.ref === optionRef ? { ...o, values: [...o.values, value] } : o)))
    },
    removeValue: (optionRef: string, valueRef: string) => {
      const users = variantsUsing(variants, optionRef, valueRef)
      const value = options.find(o => o.ref === optionRef)?.values.find(v => v.ref === valueRef)

      if (users.length > 0 && savedIds.has(optionRef)) {
        setRefusal({ at: valueRef, code: 'value-in-use', params: { value: labelOf(value?.label ?? emptyText()), count: users.length, codes: users.slice(0, 3).map(u => u.skuCode).join(', '), more: Math.max(0, users.length - 3) } })

        return
      }
      setDraft(d => ({
        options: d.options.map(o => (o.ref === optionRef ? { ...o, values: o.values.filter(v => v.ref !== valueRef) } : o)),
        assigned: Object.fromEntries(Object.entries(d.assigned).map(([id, values]) => [id, values[optionRef] === valueRef ? without(values, optionRef) : values])),
      }))
      setRefusal(undefined)
      setProblems([])
    },
    moveValue: (optionRef: string, from: number, to: number) => setOptions(list => list.map((option) => {
      if (option.ref !== optionRef)
        return option
      const values = [...option.values]
      const [moved] = values.splice(from, 1)

      values.splice(to, 0, moved!)

      return { ...option, values }
    })),
    setVariantValue: (variantId: string, optionRef: string, valueRef: string) => assign([variantId], optionRef, valueRef),
    setAll: (optionRef: string, valueRef: string) => assign(variants.map(variant => variant.id), optionRef, valueRef),
    setProblems,
    /** The rules' answer for what is staged. Empty means it can be saved. */
    check: (): Refusal[] => {
      const found = checkOptionsDraft(saved, options, variants, assigned)

      setProblems(found)

      return found
    },
  }
}

export type OptionsDraftState = ReturnType<typeof useOptionsDraft>
