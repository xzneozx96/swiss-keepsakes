import type { ProductVariant } from '@sk/api-contract'
import type { Language } from '@sk/domain/shared'
import type { OptionsDraftState } from '../hooks/use-options-draft'
import type { VariantActions } from '../lib/variant-actions'

import { useOptionsFlow } from '../hooks/use-options-flow'
import { basePriceOf } from '../lib/combinations'
import { asSaved } from '../lib/option-rules'
import { missingCombinations } from '../lib/variant-rules'
import { OptionsBlock } from './options-block'
import { PriceCard } from './price-card'
import { VariantsBlock } from './variants-block'

/**
 * The merged step, Options and variants, for a saved keepsake and for a new one (`held`: it all stays in the browser until
 * Create keepsake). One column of blocks: the Price card while the keepsake has no options, the Options block, and the
 * Variants block with a row for every combination. `committed` holds the refs the keepsake already had, so what the open
 * option adds can be told from what was there.
 */
export function OptionsAndVariantsStep({ draft, language, held, variants, committed, actions, codeFallback, showErrors }: {
  draft: OptionsDraftState
  /** The version the editor's switch has chosen. */
  language: Language
  held: boolean
  /** Every variant, archived ones too. */
  variants: ProductVariant[]
  committed: ReadonlySet<string>
  actions: VariantActions
  codeFallback: string
  /** A Next with a price or a code that is not right: the fields say so. */
  showErrors: boolean
}) {
  const flow = useOptionsFlow({ draft, committed, variants, held, commit: actions.commit })
  // The rows are named by the finished options, with the values they had; the open option adds its own on top.
  const tableOptions = asSaved(draft.options.filter(option => committed.has(option.ref)).map(option => ({ ...option, values: option.values.filter(value => committed.has(value.ref)) })))
  const only = variants.find(variant => variant.status !== 'archived')
  const rows = flow.preview?.newVariants.map(made => made.values) ?? []
  const preview = rows.length > 0 ? { options: asSaved(draft.options), rows, price: basePriceOf(variants) } : undefined

  return (
    <>
      {tableOptions.length === 0 && only && <PriceCard key={only.id} codeFallback={codeFallback} held={held} showErrors={showErrors} variant={only} onSave={actions.saveVariant} />}
      <OptionsBlock committed={committed} draft={draft} flow={flow} language={language} />
      {(tableOptions.length > 0 || preview) && <VariantsBlock actions={actions} held={held} notSold={missingCombinations(tableOptions, variants)} options={tableOptions} preview={preview} variants={variants} />}
    </>
  )
}
