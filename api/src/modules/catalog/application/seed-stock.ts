import type { Actor } from '@sk/domain/identity'
import type { StockSeeding, VariantInput } from '../ports.ts'

// Gives each SKU a write has just created its stock row, in the write's transaction (gate G-S8-D2). `skuIds` are the new
// SKUs in the order of `inputs`, the variants the request sent (the repository returns them so). A count that differs
// from the request is a bug, so it throws and the whole write rolls back.
export async function seedNewSkus<T>(stock: StockSeeding<T> | undefined, tx: T, actor: Actor, storeId: string, skuIds: string[], inputs: VariantInput[]): Promise<void> {
  if (!stock || skuIds.length === 0)
    return
  // Only a staff member passes the catalog's access check, so this guards the type.
  if (actor.kind !== 'staff')
    throw new Error('only staff create SKUs')
  if (skuIds.length !== inputs.length)
    throw new Error(`${skuIds.length} SKUs were created for ${inputs.length} variants`)
  await stock.seed(tx, storeId, skuIds.map((skuId, index) => ({ skuId, quantity: inputs[index]!.quantity ?? 0 })), actor.userId)
}
