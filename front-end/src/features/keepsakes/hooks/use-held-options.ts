import type { OptionWrite, Product } from '@sk/api-contract'
import type { RefObject } from 'react'
import type { OptionsPlan } from '../lib/combinations'
import type { VariantActions } from '../lib/variant-actions'
import type { Outcome } from './use-keepsake-editor'
import type { OptionsDraftState } from './use-options-draft'

import { useEffect, useRef, useState } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { basePriceOf, refsOf, savedRefsOf } from '../lib/combinations'
import { optionsBody, refusalText } from '../lib/option-rules'
import { problemMessageKey } from '../lib/problems'
import { variantsBody } from '../lib/variant-rules'
import { useDraftVariants } from './use-draft-variants'

/** What the Options and variants step lets the editor do with the option that is open in it. */
export interface OptionsStepHandle {
  isOpen: () => boolean
  /** Opens a finished option, to show what the save refused in it. */
  edit: (ref: string) => void
  /** Runs Done on the open option; false when it is refused (the option stays open with its errors). */
  done: () => Promise<boolean>
}

/**
 * The options of a saved keepsake while the merchant works on them (owner, 2026-11-02, decision 23). Done, Add another
 * option, Edit, a deleted value and a new order change only the browser's draft; the rows the options bring are kept here as
 * rows to come (`toCome`), with their own price, code and photo. One request, `save`, sends the options, the values the
 * saved variants take of a new option and the rows to come, when the merchant leaves the step or the editor. A saved
 * variant's own edits (price, status, code, photo, bulk changes) still save at once, as before.
 *
 * `committed` holds the refs of the options and values that were finished with Done, as in a new keepsake.
 */
export function useHeldOptions({ keepsake, draft, handle, saveOptions, saveVariant, saveVariants, createVariant, addPhoto }: {
  keepsake: Product
  draft: OptionsDraftState
  handle: RefObject<OptionsStepHandle | null>
  saveOptions: (change: { options: OptionWrite[], plan: OptionsPlan }) => Promise<Outcome>
  saveVariant: VariantActions['saveVariant']
  saveVariants: VariantActions['saveVariants']
  createVariant: VariantActions['createVariant']
  addPhoto: VariantActions['addPhoto']
}) {
  const { t } = useLocale()
  const [committed, setCommitted] = useState<ReadonlySet<string>>(() => savedRefsOf(keepsake.options))
  // What was said on the last try to leave: an option still open, an alert, a refusal that names no option.
  const [notice, setNotice] = useState<string>()
  const finished = draft.options.filter(option => committed.has(option.ref)).map(option => ({ ...option, values: option.values.filter(value => committed.has(value.ref)) }))
  const rows = useDraftVariants(finished, [], false)
  // A saved variant takes the first value of an option that is not saved yet, as the save will give it.
  const saved = keepsake.variants.map(variant => ({ ...variant, values: { ...variant.values, ...draft.assigned[variant.id] } }))
  const variants = [...saved, ...rows.variants]
  const toCome: ReadonlySet<string> = new Set(rows.variants.map(variant => variant.id))
  const hasHeld = draft.dirty || rows.variants.length > 0

  const actions: VariantActions = {
    saveVariant: (variantId, body) => (toCome.has(variantId) ? rows.save(variantId, body) : saveVariant(variantId, body)),
    saveVariants: async (list) => {
      const mine = list.filter(row => toCome.has(row.id))
      const others = list.filter(row => !toCome.has(row.id))

      if (mine.length > 0)
        await rows.saveMany(mine)

      return others.length > 0 ? saveVariants(others) : { ok: true }
    },
    createVariant,
    commit: async ({ drafts, plan }) => {
      const outcome = await rows.apply(drafts, plan)

      setCommitted(refsOf(drafts))
      setNotice(undefined)

      return outcome
    },
    addBack: (combinations, codeBase) => rows.addBack(combinations, basePriceOf(variants), codeBase, saved),
    addPhoto,
  }

  /** Sends what is held, in one request; true when nothing is held or it is saved. A refusal stays on the step. */
  const send = async (): Promise<boolean> => {
    setNotice(undefined)
    if (handle.current?.isOpen()) {
      setNotice(t('keepsakes.variants.finishOption'))

      return false
    }
    if (!hasHeld)
      return true
    const variantValues = Object.entries(draft.assigned).filter(([, values]) => Object.keys(values).length > 0).map(([variantId, values]) => ({ variantId, values }))
    const outcome = await saveOptions({ options: optionsBody(draft.options), plan: { variantValues, newVariants: variantsBody(rows.variants) } })

    if (outcome.ok) {
      draft.settle(outcome.options)
      setCommitted(savedRefsOf(outcome.options ?? keepsake.options))
      rows.clear()

      return true
    }
    if (outcome.refusals && outcome.refusals.length > 0) {
      const named = new Set(outcome.refusals.map(refusal => refusal.at))
      const target = draft.options.find(option => named.has(option.ref) || option.values.some(value => named.has(value.ref)))

      draft.setServerProblems(outcome.refusals)
      if (target)
        handle.current?.edit(target.ref)
      else
        setNotice(outcome.refusals.map(refusal => refusalText(t, refusal)).join(' '))
    }
    // A stale save has its own message and Reload.
    else if (outcome.type !== 'precondition-failed') {
      setNotice(t(problemMessageKey(outcome.type)))
    }

    return false
  }

  // Leaving the editor finishes the open option, then saves what that Done held. The save waits for the render that holds
  // it, so it reads the options as Done left them.
  const [afterDone, setAfterDone] = useState(0)
  const waitingRef = useRef<(saved: boolean) => void>(undefined)
  const sendRef = useRef(send)

  useEffect(() => {
    sendRef.current = send
  })
  useEffect(() => {
    const resolve = waitingRef.current

    waitingRef.current = undefined
    if (resolve)
      void sendRef.current().then(resolve)
  }, [afterDone])

  const save = async ({ finishOpen = false }: { finishOpen?: boolean } = {}): Promise<boolean> => {
    if (finishOpen && handle.current?.isOpen()) {
      if (!(await handle.current.done()))
        return false

      return new Promise<boolean>((resolve) => {
        waitingRef.current = resolve
        setAfterDone(count => count + 1)
      })
    }

    return send()
  }

  return { committed, variants, toCome, hasHeld, actions, save, notice }
}
