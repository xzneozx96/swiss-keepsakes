import type { Actor } from '@sk/domain/identity'
import type { VariantInput } from '../ports.ts'
import type { CatalogDeps } from './deps.ts'
import type { Result } from './failure.ts'
import type { ProductDetail } from './product-detail.ts'
import { mayEditCatalog, staffActor } from './access.ts'
import { fail, ok } from './failure.ts'
import { checkVariantValues } from './option-rules.ts'
import { describe } from './product-detail.ts'
import { isSkuCode } from './sku-code.ts'

// One more variant: a combination that is sold. It takes one value of each option of the keepsake, and no other variant,
// archived ones included, may hold the same combination. It is live at once and takes no row version (ADR-014). The
// code's uniqueness in the shop is the database's (skus_store_sku_code_key).
export function makeCreateVariant<T>({ uow, products, media, audit, clock }: CatalogDeps<T>) {
  return async (actor: Actor, storeId: string, productId: string, input: VariantInput, requestId: string | null): Promise<Result<ProductDetail>> => {
    if (!mayEditCatalog(actor, storeId))
      return fail({ reason: 'forbidden' })
    if (!isSkuCode(input.skuCode))
      return fail({ reason: 'sku-code-invalid', path: 'skuCode' })
    return uow.run(async (tx) => {
      const product = await products.findForUpdate(tx, storeId, productId)
      if (!product)
        return fail({ reason: 'not-found' })
      const refusals = checkVariantValues(product.options, product.variants, input.values, 'values', input.skuCode)
      if (refusals.length > 0)
        return fail({ reason: 'refused', refusals })
      const saved = await products.insertVariant(tx, product, input, clock.now())
      await audit.record(tx, {
        storeId,
        actor: staffActor(actor),
        entity: 'product',
        entityId: product.id,
        action: 'variant-created',
        after: { skuCode: input.skuCode, status: input.status },
        requestId,
      })
      return ok(await describe(media, tx, saved))
    })
  }
}
