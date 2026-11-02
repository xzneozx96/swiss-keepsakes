import type { ProductOption } from '@sk/api-contract'
import type { OptionDraft, Refusal, Text, Valued, ValueDraft, Values } from '../lib/option-rules'

import { useState } from 'react'

import { asSaved, checkStagedOptions, DEFAULT_SWATCH, draftOfOptions, duplicateValue, labelOf, moveItem, newOption, splitValues, VALUE_LABEL_MAX, variantsUsing } from '../lib/option-rules'

/** Each variant's value of each new option, made from the draft: variant id, then option ref, then value ref. */
type Assigned = Record<string, Values>

/** What the draft holds, for an option that is cancelled to put back. */
export interface OptionsSnapshot { options: OptionDraft[], /** Options whose swatch switch is on (the API has no flag: swatches live on the values, so an option with no value yet needs it here). */ swatchOn: Record<string, boolean> }

interface State extends OptionsSnapshot {
  /** The saved options as JSON, to tell an edited draft from a clean one when the saved options change. */
  base: string
  /** A save was tried: from then on every problem shows, not only a repeated value. */
  tried: boolean
  /** What the API refused. */
  server: Refusal[]
  /** A delete that a variant forbids, shown where the delete was pressed. */
  refusal?: Refusal
}

const usedBy = (users: Valued[]) => ({ count: users.length, codes: users.slice(0, 3).map(user => user.skuCode).join(', '), more: Math.max(0, users.length - 3) })

/**
 * The options as the Options and variants step stages them, for a saved keepsake (`saved` and its `variants`) and for a new
 * one (nothing saved: `saved` is empty). Nothing is saved here. `problems` is what the rules say, shown after a save was
 * tried and, for a value typed twice, at once. A delete that a variant forbids is refused where it was pressed (`refusalAt`).
 * Options save whole (ADR-027), so one draft holds all of them. A new option goes on every existing variant as its first
 * value (`assigned`), so the merchant is never asked for it.
 */
export function useOptionsDraft({ saved, variants, initial }: { saved: ProductOption[], variants: Valued[], /** Options to start from instead of the saved ones: a new keepsake that a reload brought back. */ initial?: OptionDraft[] }) {
  const savedOptions = draftOfOptions(saved)
  const savedJson = JSON.stringify(savedOptions)
  const [state, setState] = useState<State>(() => ({ options: initial ?? savedOptions, swatchOn: {}, base: savedJson, tried: false, server: [] }))

  // The saved options changed under the draft (a save, or the keepsake loaded again): a clean draft follows them, an edited one stays.
  if (state.base !== savedJson)
    setState(current => ({ ...current, base: savedJson, ...(JSON.stringify(current.options) === current.base ? { options: savedOptions, swatchOn: {}, tried: false, server: [] } : {}) }))

  const { options } = state
  const savedRefs = new Set(saved.flatMap(option => [option.id, ...option.values.map(value => value.id)]))
  const hasValue = (option: OptionDraft) => option.values.some(value => labelOf(value.label) !== '')
  const assignedFor = (list: OptionDraft[]): Assigned => Object.fromEntries(variants.map(variant => [variant.id, Object.fromEntries(list.filter(option => !savedRefs.has(option.ref) && hasValue(option)).map(option => [option.ref, option.values.find(value => labelOf(value.label) !== '')!.ref]))]))
  const assigned = assignedFor(options)
  const found = checkStagedOptions(saved, options, variants, assigned)
  const problems = [...(state.tried ? found : found.filter(problem => problem.code === 'value-duplicate')), ...state.server]
  const swatchesOn = (option: OptionDraft) => option.values.some(value => value.swatch !== null) || state.swatchOn[option.ref] === true

  const edit = (change: (list: OptionDraft[]) => OptionDraft[]) => {
    setState(current => ({ ...current, options: change(current.options), refusal: undefined, server: [] }))
  }
  const editOption = (ref: string, change: (option: OptionDraft) => OptionDraft) => edit(list => list.map(option => (option.ref === ref ? change(option) : option)))
  const refuse = (refusal: Refusal) => setState(current => ({ ...current, refusal }))

  return {
    options,
    variants,
    assigned,
    problems,
    tried: state.tried,
    dirty: JSON.stringify(options) !== state.base,
    /** The swatch switch of an option: on when a value has a colour, or when it was switched on before any value exists. */
    swatchesOn,
    problemsAt: (at: string) => problems.filter(problem => problem.at === at),
    refusalAt: (at: string) => (state.refusal?.at === at ? state.refusal : undefined),
    isNew: (ref: string) => !savedRefs.has(ref),
    isSaved: (ref: string) => savedRefs.has(ref),

    addOption: () => {
      const option = newOption(crypto.randomUUID())

      edit(list => [...list, option])

      return option.ref
    },
    patchName: (ref: string, name: Text) => editOption(ref, option => ({ ...option, name })),
    /** False, and a refusal at the option, when a variant of the saved keepsake still holds it. */
    removeOption: (ref: string) => {
      const option = options.find(o => o.ref === ref)
      const users = variantsUsing(variants, ref)

      if (option && savedRefs.has(ref) && users.length > 0) {
        refuse({ at: ref, code: 'option-in-use', params: { option: labelOf(option.name), ...usedBy(users) } })

        return false
      }
      edit(list => list.filter(o => o.ref !== ref))

      return true
    },
    /** Adds the values in typed or pasted text at the end. Returns the words that the option already has. */
    addValues: (ref: string, input: string) => {
      const option = options.find(o => o.ref === ref)
      const refused: string[] = []
      const added: ValueDraft[] = []

      if (option) {
        const swatch = swatchesOn(option) ? DEFAULT_SWATCH : null

        for (const word of splitValues(input).map(part => part.slice(0, VALUE_LABEL_MAX))) {
          if (duplicateValue({ ...option, values: [...option.values, ...added] }, { en: word, de: '' }))
            refused.push(word)
          else
            added.push({ ref: crypto.randomUUID(), label: { en: word, de: '' }, swatch })
        }
        if (added.length > 0)
          editOption(ref, current => ({ ...current, values: [...current.values, ...added] }))
      }

      return { added: added.length, addedRefs: added.map(value => value.ref), refused }
    },
    patchValue: (optionRef: string, valueRef: string, patch: Partial<ValueDraft>) =>
      editOption(optionRef, option => ({ ...option, values: option.values.map(value => (value.ref === valueRef ? { ...value, ...patch } : value)) })),
    /** False, and a refusal at the value, when a variant of the saved keepsake still holds it. */
    removeValue: (optionRef: string, valueRef: string) => {
      const value = options.find(o => o.ref === optionRef)?.values.find(v => v.ref === valueRef)
      const users = variantsUsing(variants, optionRef, valueRef)

      if (value && savedRefs.has(valueRef) && users.length > 0) {
        refuse({ at: valueRef, code: 'value-in-use', params: { value: labelOf(value.label), ...usedBy(users) } })

        return false
      }
      edit(list => list.map(option => (option.ref === optionRef ? { ...option, values: option.values.filter(v => v.ref !== valueRef) } : option)))

      return true
    },
    moveValue: (optionRef: string, from: number, to: number) => editOption(optionRef, option => ({ ...option, values: moveItem(option.values, from, to) })),
    setSwatches: (optionRef: string, on: boolean) => {
      setState(current => ({ ...current, swatchOn: { ...current.swatchOn, [optionRef]: on } }))
      editOption(optionRef, option => ({ ...option, values: option.values.map(value => ({ ...value, swatch: on ? value.swatch ?? DEFAULT_SWATCH : null })) }))
    },

    /** Every problem the rules find, now (in `list` when given: the options as they will be once a value with no name is dropped); from here on all of them show. Empty means it can be saved. */
    check: (list?: OptionDraft[]): Refusal[] => {
      setState(current => ({ ...current, tried: true }))

      return list ? checkStagedOptions(saved, list, variants, assignedFor(list)) : found
    },
    /** Whether `list` differs from the saved options. */
    isDirty: (list: OptionDraft[]) => JSON.stringify(list) !== state.base,
    replaceOptions: (list: OptionDraft[]) => edit(() => list),
    /** What the API refused, in the merchant's words at the option, value or variant. */
    setServerProblems: (refusals: Refusal[]) => setState(current => ({ ...current, tried: true, server: refusals })),
    /** Back to the saved options. */
    discard: () => setState(current => ({ ...current, options: savedOptions, swatchOn: {}, tried: false, server: [], refusal: undefined })),
    snapshot: (): OptionsSnapshot => ({ options, swatchOn: state.swatchOn }),
    restore: (snapshot: OptionsSnapshot) => setState(current => ({ ...current, ...snapshot, tried: false, server: [], refusal: undefined })),
    /** After a save: the draft is what was saved, trimmed as the API trims it, and nothing is staged any more. */
    settle: () => setState((current) => {
      const next = draftOfOptions(asSaved(current.options))

      return { ...current, options: next, base: JSON.stringify(next), swatchOn: {}, tried: false, server: [], refusal: undefined }
    }),
  }
}

export type OptionsDraftState = ReturnType<typeof useOptionsDraft>
