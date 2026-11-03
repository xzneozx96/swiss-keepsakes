import type { ProductVariant } from '@sk/api-contract'
import type { OptionsPlan } from '../lib/combinations'
import type { OptionDraft } from '../lib/option-rules'
import type { CommitOptions } from '../lib/variant-actions'
import type { OptionsDraftState, OptionsSnapshot } from './use-options-draft'

import { useState } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { basePriceOf, planOptionsDone } from '../lib/combinations'
import { labelOf, optionsBody } from '../lib/option-rules'
import { problemMessageKey } from '../lib/problems'
import { baseQuantityOf, fillNewRows } from '../lib/stock-rules'

interface Open { ref: string, snapshot: OptionsSnapshot, /** Added with Add option and not finished yet. */ isNew: boolean }

/**
 * The one option that is open in the Options block, and what Done, Cancel and Delete do with it. Done checks the option,
 * works out what saving it brings (`planOptionsDone`) and hands the options and that plan to `commit`, which holds them in
 * the browser until the keepsake is saved (a new one at Create, a saved one when the step is left). Only one option is open at a time, so the variants that
 * are still to come always belong to it. `committed` holds the refs the keepsake had when the option was opened.
 */
export function useOptionsFlow({ draft, committed, variants, codeBase, commit }: {
  draft: OptionsDraftState
  committed: ReadonlySet<string>
  /** Every variant, archived ones too. */
  variants: ProductVariant[]
  /** The keepsake code that new variants' codes start with while the SKU switch is on ('' with none yet); null while it is off. */
  codeBase: string | null
  commit: CommitOptions
}) {
  const { t } = useLocale()
  const [open, setOpen] = useState<Open | undefined>(() => {
    const unfinished = draft.options.find(option => !committed.has(option.ref))

    return unfinished && { ref: unfinished.ref, snapshot: { options: draft.options.filter(option => option.ref !== unfinished.ref) }, isNew: true }
  })
  const [isPending, setIsPending] = useState(false)
  const [failure, setFailure] = useState<string>()
  const basePrice = basePriceOf(variants)
  const openOption = open && draft.options.find(option => option.ref === open.ref)
  // What the open option would bring, shown as rows to come before Done is pressed.
  const preview = openOption ? planOptionsDone({ options: draft.options, committed, variants, basePrice, codeBase }) : undefined
  /** The new rows start at the quantity typed in the Price block (the first variant's stock); each stays editable on its own (item 25). */
  const withStock = (plan: OptionsPlan): OptionsPlan => ({ ...plan, newVariants: fillNewRows(plan.newVariants, baseQuantityOf(variants)) })

  const droppingBlanks = (ref: string) => draft.options.map(option => (option.ref === ref ? { ...option, values: option.values.filter(value => labelOf(value.label) !== '' || draft.isSaved(value.ref)) } : option))

  /** Checks the open option and saves it with the combinations it brings; true when it is done and folded. */
  const done = async (): Promise<boolean> => {
    if (!open)
      return false
    setFailure(undefined)
    const options = droppingBlanks(open.ref)
    const problems = draft.check(options)

    if (problems.length > 0)
      return false
    draft.replaceOptions(options)
    const plan = withStock(planOptionsDone({ options, committed, variants, basePrice, codeBase }))

    // Nothing to send when the option is what the keepsake already has.
    if (!draft.isDirty(options) && plan.newVariants.length === 0 && plan.variantValues.length === 0) {
      setOpen(undefined)

      return true
    }
    setIsPending(true)
    const outcome = await commit({ options: optionsBody(options), drafts: options, plan })

    setIsPending(false)
    if (outcome.ok) {
      setOpen(undefined)

      return true
    }
    if (outcome.refusals && outcome.refusals.length > 0)
      draft.setServerProblems(outcome.refusals)
    else
      setFailure(t(problemMessageKey(outcome.type)))

    return false
  }

  return {
    open,
    openOption,
    preview,
    isPending,
    failure,
    /** With an option open, runs its Done first: a refused Done keeps it open and opens no new one. */
    add: async () => {
      if (open && !(await done()))
        return
      const snapshot = draft.snapshot()

      setFailure(undefined)
      setOpen({ ref: draft.addOption(), snapshot, isNew: true })
    },
    edit: (ref: string) => {
      if (open)
        return
      setFailure(undefined)
      setOpen({ ref, snapshot: draft.snapshot(), isNew: false })
    },
    done,
    /** Puts back the option as it was when it opened; an option that was only just added goes. */
    cancel: () => {
      if (!open)
        return
      if (open.isNew)
        draft.removeOption(open.ref)
      else
        draft.restore(open.snapshot)
      setFailure(undefined)
      setOpen(undefined)
    },
    /** The options in a new order, or without a deleted one, held like a Done with no combination to make; true when it is held. */
    saveList: async (options: OptionDraft[]): Promise<boolean> => {
      setFailure(undefined)
      draft.replaceOptions(options)
      setIsPending(true)
      const outcome = await commit({ options: optionsBody(options), drafts: options, plan: { variantValues: [], newVariants: [] } })

      setIsPending(false)
      setOpen(undefined)
      if (outcome.ok)
        return true
      if (outcome.refusals && outcome.refusals.length > 0)
        draft.setServerProblems(outcome.refusals)
      else
        setFailure(t(problemMessageKey(outcome.type)))

      return false
    },
  }
}

export type OptionsFlow = ReturnType<typeof useOptionsFlow>
