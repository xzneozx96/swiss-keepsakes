import type { Actor } from '@sk/domain/identity'
import type { Product, ProductVariant, StockSeeding, VariantInput } from '../ports.ts'

// Gives each SKU a write has just created its stock row, in the write's transaction (gate G-S8-D2). `created` are the new
// variants in the order the request sent them: the repository lists variants by creation time and then id, and the ids
// of one write step forward in that order. A count that differs from the request is a bug, so it throws and the whole
// write rolls back.
export async function seedNewSkus<T>(stock: StockSeeding<T> | undefined, tx: T, actor: Actor, storeId: string, created: ProductVariant[], inputs: VariantInput[]): Promise<void> {
  if (!stock || created.length === 0)
    return
  // Only a staff member passes the catalog's access check, so this guards the type.
  if (actor.kind !== 'staff')
    throw new Error('only staff create SKUs')
  if (created.length !== inputs.length)
    throw new Error(`${created.length} SKUs were created for ${inputs.length} variants`)
  await stock.seed(tx, storeId, created.map((variant, index) => ({ skuId: variant.id, quantity: inputs[index]!.quantity ?? 0 })), actor.userId)
}

// The variants of `after` that `before` does not have.
export function newVariantsOf(before: Product, after: Product): ProductVariant[] {
  const known = new Set(before.variants.map(variant => variant.id))

  return after.variants.filter(variant => !known.has(variant.id))
}
