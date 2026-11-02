import type { Actor } from '@sk/domain/identity'
import type { VariantChangeRequest, VariantChanges } from '../ports.ts'
import type { CatalogDeps } from './deps.ts'
import type { Result } from './failure.ts'
import type { ProductDetail } from './product-detail.ts'
import { mayEditCatalog, staffActor } from './access.ts'
import { fail, ok } from './failure.ts'
import { checkVariantValues, variantName } from './option-rules.ts'
import { checkVariantPhotos, describe } from './product-detail.ts'
import { isSkuCode } from './sku-code.ts'

// One variant's code, price, status or values. The change is live at once (ADR-014: SKU prices are structure, saved
// directly), so this takes no row version. A code that another SKU of the shop holds is refused by the database
// (skus_store_sku_code_key). New values follow the option rules and may not land on another variant's combination,
// archived ones included. Archiving keeps the variant and is final (restoring has no rule yet), and is refused while
// open orders reserve units. Removed (owner, 2026-11-02) is the keepsake's rule for a variant: one that no order line
// names is deleted and frees its combination, one that does is archived. Hiding the last variant for sale on a published keepsake is allowed: guests then find
// nothing to buy, and the publish card says so.
export function makeSaveVariant<T>({ uow, products, media, audit, clock, reservations, sales }: CatalogDeps<T>) {
  return async (actor: Actor, storeId: string, productId: string, skuId: string, request: VariantChangeRequest, requestId: string | null): Promise<Result<ProductDetail>> => {
    if (!mayEditCatalog(actor, storeId))
      return fail({ reason: 'forbidden' })
    if (request.skuCode !== undefined && request.skuCode !== null && !isSkuCode(request.skuCode))
      return fail({ reason: 'sku-code-invalid', path: 'skuCode' })
    const removing = request.status === 'removed'
    return uow.run(async (tx) => {
      const product = await products.findForUpdate(tx, storeId, productId)
      const variant = product?.variants.find(v => v.id === skuId)
      if (!product || !variant)
        return fail({ reason: 'not-found' })
      if (product.status === 'archived')
        return fail({ reason: 'archived' })
      if (variant.status === 'archived')
        return fail({ reason: 'refused', refusals: [{ code: 'variant-archived', path: 'status', params: { code: variantName(variant, product.options) } }] })
      // A removal changes nothing else; a sold variant is archived, an unsold one is deleted below.
      const sold = removing && sales ? (await sales.soldSkuIds(tx, storeId, [skuId])).has(skuId) : false
      const changes: VariantChanges = removing ? { status: 'archived' } : (request as VariantChanges)
      if (changes.values) {
        const refusals = checkVariantValues(product.options, product.variants.filter(v => v.id !== skuId), changes.values, 'values', (changes.skuCode === undefined ? variant.skuCode : changes.skuCode) ?? '')
        if (refusals.length > 0)
          return fail({ reason: 'refused', refusals })
      }
      if (changes.status === 'archived' && reservations) {
        const reserved = (await reservations.reservedBySku(tx, storeId, [skuId])).get(skuId) ?? 0
        if (reserved > 0)
          return fail({ reason: 'refused', refusals: [{ code: 'variant-reserved', path: 'status', params: { code: variantName(variant, product.options), count: reserved } }] })
      }
      if (removing && !sold) {
        const left = await products.removeVariants(tx, product, [skuId])
        await audit.record(tx, {
          storeId,
          actor: staffActor(actor),
          entity: 'sku',
          entityId: skuId,
          action: 'deleted',
          before: { status: variant.status, skuCode: variant.skuCode },
          requestId,
        })
        return ok(await describe({ media, sales }, tx, left))
      }
      const photoRefused = await checkVariantPhotos(media, tx, storeId, [changes.mediaId])
      if (photoRefused)
        return fail(photoRefused)
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
      return ok(await describe({ media, sales }, tx, saved))
    })
  }
}
