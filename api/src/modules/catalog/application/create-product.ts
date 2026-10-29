import type { Actor } from '@sk/domain/identity'
import type { Localized } from '../ports.ts'
import type { CatalogDeps } from './deps.ts'
import type { Result } from './failure.ts'
import type { ProductDetail } from './product-detail.ts'
import { hasText } from '@sk/domain/content'
import { mayEditCatalog } from './access.ts'
import { fail, ok } from './failure.ts'
import { checkPhotos, describe } from './product-detail.ts'
import { isSkuCode } from './sku-code.ts'

export interface CreateProductInput {
  name: Localized
  text: Localized
  photoIds: string[]
  commissionRate: number
  variant: { skuCode: string, priceRappen: number }
}

// A new keepsake is a draft with its one variant for sale. It needs a name in one language and a valid code. The
// code's uniqueness in the shop is skus_store_sku_code_key, which the route maps to sku-code-taken.
export function makeCreateProduct<T>({ uow, products, media, clock }: CatalogDeps<T>) {
  return async (actor: Actor, storeId: string, input: CreateProductInput, _requestId: string | null): Promise<Result<ProductDetail>> => {
    if (!mayEditCatalog(actor, storeId))
      return fail({ reason: 'forbidden' })
    if (!hasText(input.name))
      return fail({ reason: 'name-required' })
    if (!isSkuCode(input.variant.skuCode))
      return fail({ reason: 'sku-code-invalid', path: 'variants.0.skuCode' })
    return uow.run(async (tx) => {
      const refused = await checkPhotos(media, tx, storeId, input.photoIds)
      if (refused)
        return fail(refused)
      const product = await products.insert(tx, storeId, {
        name: input.name,
        text: input.text,
        media: input.photoIds,
        commissionRate: input.commissionRate,
        variant: input.variant,
      }, clock.now())
      return ok(await describe(media, tx, product))
    })
  }
}
