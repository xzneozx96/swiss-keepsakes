import type { OptionWrite, VariantSaveBody, VariantsSaveBody } from '@sk/api-contract'
import type { Outcome } from '../hooks/use-keepsake-editor'
import type { OptionsPlan } from './combinations'
import type { OptionDraft, Values } from './option-rules'

/** One variant's price, code or status. A saved keepsake sends it to the API at once; a new one changes its draft. */
export type SaveVariant = (variantId: string, body: VariantSaveBody) => Promise<Outcome>

/** The price, status, code or photo of several variants in one request, all or nothing. */
export type SaveVariants = (rows: VariantsSaveBody['variants']) => Promise<Outcome>

/** The options as they stand, with what saving them brings: the values existing variants take and the combinations to create. A new keepsake and a saved one both hold them in the browser: the saved editor sends them in one request when the merchant leaves the step. */
export type CommitOptions = (change: { options: OptionWrite[], /** The same options as drafts, for a keepsake that is only in the browser. */ drafts: OptionDraft[], plan: OptionsPlan }) => Promise<Outcome>

/** The combinations to bring back (no variant holds them), with the options left as they are. `codeBase` is the keepsake code their codes start with while the SKU switch is on, null while it is off. */
export type AddBack = (combinations: Values[], codeBase: string | null) => Promise<Outcome>

/** What the merged step does with its changes. The options and the rows they bring stay in the browser (a new keepsake until Create, a saved one until the step is left); a saved variant's own edits go to the API at once. */
export interface VariantActions {
  saveVariant: SaveVariant
  saveVariants: SaveVariants
  commit: CommitOptions
  addBack: AddBack
  /** A photo that a variant takes and the keepsake does not have yet joins the keepsake's photos (the autosave, or the draft). */
  addPhoto: (mediaId: string) => void
}
