import type { Actor } from '@sk/domain/identity'
import type { VariantChanges } from '../ports.ts'
import type { CatalogDeps } from './deps.ts'
import type { Result } from './failure.ts'
import type { ProductDetail } from './product-detail.ts'
import { mayEditCatalog, staffActor } from './access.ts'
import { fail, ok } from './failure.ts'
import { checkVariantValues } from './option-rules.ts'
import { describe } from './product-detail.ts'
import { isSkuCode } from './sku-code.ts'

// One variant's code, price, status or values. The change is live at once (ADR-014: SKU prices are structure, saved
// directly), so this takes no row version. A code that another SKU of the shop holds is refused by the database
// (skus_store_sku_code_key). New values follow the option rules and may not land on another variant's combination,
// archived ones included. Archiving keeps the variant and is final (restoring has no rule yet), and is refused while
// open orders reserve units. Hiding the last variant for sale on a published keepsake is allowed: guests then find
// nothing to buy, and the publish card says so.
export function makeSaveVariant<T>({ uow, products, media, audit, clock, reservations }: CatalogDeps<T>) {
  return async (actor: Actor, storeId: string, productId: string, skuId: string, changes: VariantChanges, requestId: string | null): Promise<Result<ProductDetail>> => {
    if (!mayEditCatalog(actor, storeId))
      return fail({ reason: 'forbidden' })
    if (changes.skuCode !== undefined && !isSkuCode(changes.skuCode))
      return fail({ reason: 'sku-code-invalid', path: 'skuCode' })
    return uow.run(async (tx) => {
      const product = await products.findForUpdate(tx, storeId, productId)
      const variant = product?.variants.find(v => v.id === skuId)
      if (!product || !variant)
        return fail({ reason: 'not-found' })
      if (variant.status === 'archived')
        return fail({ reason: 'refused', refusals: [{ code: 'variant-archived', path: 'status', params: { code: variant.skuCode } }] })
      if (changes.values) {
        const refusals = checkVariantValues(product.options, product.variants.filter(v => v.id !== skuId), changes.values, 'values', changes.skuCode ?? variant.skuCode)
        if (refusals.length > 0)
          return fail({ reason: 'refused', refusals })
      }
      if (changes.status === 'archived' && reservations) {
        const reserved = (await reservations.reservedBySku(tx, storeId, [skuId])).get(skuId) ?? 0
        if (reserved > 0)
          return fail({ reason: 'refused', refusals: [{ code: 'variant-reserved', path: 'status', params: { code: variant.skuCode, count: reserved } }] })
      }
      const saved = await products.saveVariant(tx, product, skuId, changes, clock.now())
      if (!saved)
        return fail({ reason: 'not-found' })
      if (changes.status === 'archived') {
        await audit.record(tx, {
          storeId,
          actor: staffActor(actor),
          entity: 'sku',
          entityId: skuId,
          action: 'archived',
          before: { status: variant.status },
          after: { status: 'archived' },
          requestId,
        })
      }
      return ok(await describe(media, tx, saved))
    })
  }
}
