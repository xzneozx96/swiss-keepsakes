import type { Actor } from '@sk/domain/identity'
import type { VariantChanges } from '../ports.ts'
import type { CatalogDeps } from './deps.ts'
import type { Result } from './failure.ts'
import type { ProductDetail } from './product-detail.ts'
import { mayEditCatalog } from './access.ts'
import { fail, ok } from './failure.ts'
import { describe } from './product-detail.ts'
import { isSkuCode } from './sku-code.ts'

// One variant's code, price or status. The price and the status are live at once (ADR-014: SKU prices are structure,
// saved directly), so this takes no row version. A code that another SKU of the shop holds is refused by the
// database (skus_store_sku_code_key). Hiding the last variant for sale on a published keepsake is allowed: guests
// then find nothing to buy, and the publish card says so.
export function makeSaveVariant<T>({ uow, products, media, clock }: CatalogDeps<T>) {
  return async (actor: Actor, storeId: string, productId: string, skuId: string, changes: VariantChanges, _requestId: string | null): Promise<Result<ProductDetail>> => {
    if (!mayEditCatalog(actor, storeId))
      return fail({ reason: 'forbidden' })
    if (changes.skuCode !== undefined && !isSkuCode(changes.skuCode))
      return fail({ reason: 'sku-code-invalid', path: 'skuCode' })
    return uow.run(async (tx) => {
      const product = await products.findForUpdate(tx, storeId, productId)
      if (!product)
        return fail({ reason: 'not-found' })
      const saved = await products.saveVariant(tx, product, skuId, changes, clock.now())
      return saved ? ok(await describe(media, tx, saved)) : fail({ reason: 'not-found' })
    })
  }
}
