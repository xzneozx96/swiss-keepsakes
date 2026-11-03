import type { ProductVariant } from '@sk/api-contract'
import type { Language } from '@sk/domain/shared'
import type { RefObject } from 'react'
import type { OptionsStepHandle } from '../hooks/use-held-options'
import type { OptionsDraftState } from '../hooks/use-options-draft'
import type { VariantActions } from '../lib/variant-actions'

import { useImperativeHandle, useState } from 'react'

import { useConfirm } from '@/components/confirm-dialog'
import { useLocale } from '@/contexts/locale-context'
import { useOptionNames } from '../hooks/use-option-names'
import { useOptionsFlow } from '../hooks/use-options-flow'
import { basePriceOf, codeBaseOf } from '../lib/combinations'
import { asSaved } from '../lib/option-rules'
import { problemMessageKey } from '../lib/problems'
import { missingCombinations } from '../lib/variant-rules'
import { OptionsBlock } from './options-block'
import { PriceCard } from './price-card'
import { VariantsBlock } from './variants-block'

const NONE: ReadonlySet<string> = new Set()

/**
 * The merged step, Options and variants, for a saved keepsake and for a new one (`held`: it all stays in the browser until
 * Create keepsake). One column of blocks: the Price card while the keepsake has no options, the Options block, and the
 * Variants block with a row for every combination. `committed` holds the refs the keepsake already had, so what the open
 * option adds can be told from what was there.
 *
 * The SKU switch ("This keepsake has SKU codes", owner 2026-11-02) is on while any variant that is for sale or hidden has a
 * code, or while the merchant has switched it on (a choice kept here, as no code exists yet to show it). Turning it off asks
 * first, then clears every code in one request. Archived variants keep theirs: the switch does not count them.
 */
export function OptionsAndVariantsStep({ storeId, keepsakeId, draft, language, held, toCome = NONE, handle, variants, committed, actions, photoIds, showErrors }: {
  storeId: string
  /** The saved keepsake's id; its own option names are not suggested for it. */
  keepsakeId?: string
  draft: OptionsDraftState
  /** The version the editor's switch has chosen. */
  language: Language
  held: boolean
  /** The rows that a saved keepsake's held options will create: each is held like the rows of a new keepsake. */
  toCome?: ReadonlySet<string>
  /** Lets the editor ask whether an option is open and open one that a refused save names. */
  handle?: RefObject<OptionsStepHandle | null>
  /** Every variant, archived ones too. */
  variants: ProductVariant[]
  committed: ReadonlySet<string>
  actions: VariantActions
  /** The keepsake's photos, which a variant's photo sheet offers first. */
  photoIds: string[]
  /** A Next with a price or a code that is not right: the fields say so. */
  showErrors: boolean
}) {
  const { t } = useLocale()
  const { confirm, dialog } = useConfirm()
  const [chosen, setChosen] = useState(false)
  // The rows are named by the finished options, with the values they had; the open option adds its own on top.
  const tableOptions = asSaved(draft.options.filter(option => committed.has(option.ref)).map(option => ({ ...option, values: option.values.filter(value => committed.has(value.ref)) })))
  const live = variants.filter(variant => variant.status !== 'archived')
  const coded = live.filter(variant => variant.skuCode)
  const skuOn = chosen || coded.length > 0
  // New rows start with the keepsake's code while the switch is on, and have none while it is off.
  const codeBase = skuOn ? codeBaseOf(variants, tableOptions) : null
  const flow = useOptionsFlow({ draft, committed, variants, codeBase, commit: actions.commit })
  useImperativeHandle(handle, () => ({ isOpen: () => flow.open !== undefined, edit: flow.edit, done: flow.done }))
  const suggestions = useOptionNames(storeId, keepsakeId)
  const only = variants.find(variant => variant.status !== 'archived')
  // No option: the Price block always shows. A variant that is archived keeps its (empty) combination, so a new one would
  // clash; with only archived ones the block stays away (decision pending, see the unit report).
  const showsPrice = tableOptions.length === 0 && (only !== undefined || variants.length === 0)
  const rows = flow.preview?.newVariants.map(made => made.values) ?? []
  const preview = rows.length > 0 ? { options: asSaved(draft.options), rows, price: basePriceOf(variants) } : undefined

  /** On shows the code fields; off with codes asks, then clears them all in one request (the dialog waits for the answer). */
  const toggleSku = (on: boolean) => {
    if (on) {
      setChosen(true)

      return
    }
    if (coded.length === 0) {
      setChosen(false)

      return
    }
    void confirm({
      title: t(coded.length === 1 ? 'keepsakes.sku.off.title.one' : 'keepsakes.sku.off.title.other', { count: coded.length }),
      body: t('keepsakes.sku.off.body'),
      confirmLabel: t('keepsakes.sku.off.confirm'),
      run: async () => {
        const outcome = await actions.saveVariants(coded.map(variant => ({ id: variant.id, skuCode: null })))

        if (!outcome.ok)
          throw new Error(t(problemMessageKey(outcome.type)))
        setChosen(false)
      },
      problem: error => (error instanceof Error ? error.message : t(problemMessageKey('unknown'))),
    })
  }
  const sku = { isOn: skuOn, codeBase, onChange: toggleSku }

  return (
    <>
      {showsPrice && <PriceCard key={only?.id ?? 'none'} held={held} showErrors={showErrors} sku={sku} variant={only} onCreate={actions.createVariant} onSave={actions.saveVariant} onSetStock={actions.setStock} />}
      <OptionsBlock committed={committed} draft={draft} flow={flow} language={language} suggestions={suggestions} />
      {(tableOptions.length > 0 || preview) && <VariantsBlock actions={actions} held={held} toCome={toCome} notSold={missingCombinations(tableOptions, variants)} options={tableOptions} ownPhotos={photoIds} preview={preview} sku={sku} storeId={storeId} variants={variants} />}
      {dialog}
    </>
  )
}
