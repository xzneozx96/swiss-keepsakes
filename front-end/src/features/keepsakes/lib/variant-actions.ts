import type { OptionWrite, VariantSaveBody, VariantsSaveBody } from '@sk/api-contract'
import type { Outcome } from '../hooks/use-keepsake-editor'
import type { OptionsPlan } from './combinations'
import type { OptionDraft, Values } from './option-rules'

/** One variant's price, code or status. A saved keepsake sends it to the API at once; a new one changes its draft. */
export type SaveVariant = (variantId: string, body: VariantSaveBody) => Promise<Outcome>

/** The price or status of several variants in one request, all or nothing. */
export type SaveVariants = (rows: VariantsSaveBody['variants']) => Promise<Outcome>

/** The options as they stand, with what saving them brings: the values existing variants take and the combinations to create. One request. */
export type CommitOptions = (change: { options: OptionWrite[], /** The same options as drafts, for a keepsake that is only in the browser. */ drafts: OptionDraft[], plan: OptionsPlan }) => Promise<Outcome>

/** The combinations to bring back (no variant holds them), with the options left as they are. */
export type AddBack = (combinations: Values[]) => Promise<Outcome>

/** What the merged step does with its changes: the saved editor sends them to the API, the new one keeps them in the browser. */
export interface VariantActions {
  saveVariant: SaveVariant
  saveVariants: SaveVariants
  commit: CommitOptions
  addBack: AddBack
}
