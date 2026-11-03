import type { ProductVariant } from '@sk/api-contract'
import type { NewVariant } from './combinations'

/**
 * The stock rules of the editor (decision record 2026-11-02, item 25): stock is per variant and never shared. A quantity
 * typed in the Price block with no options only gives the variants made from then on their starting figure.
 */

/** The quantity a new variant starts with: the first variant's stock, the one the merchant typed in the Price block. 0 when it has none. */
export function baseQuantityOf(variants: Pick<ProductVariant, 'onHand' | 'status'>[]): number {
  return (variants.find(variant => variant.status !== 'archived') ?? variants[0])?.onHand ?? 0
}

/** New rows with `quantity` as their starting stock. A row that already has its own figure keeps it. */
export function fillNewRows(rows: NewVariant[], quantity: number): NewVariant[] {
  return rows.map(row => ({ ...row, quantity: row.quantity ?? quantity }))
}
