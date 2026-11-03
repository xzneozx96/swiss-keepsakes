import type { Actor } from '@sk/domain/identity'
import type { Localized, LocalizedDoc, OptionInput, VariantInput } from '../ports.ts'
import type { CatalogDeps } from './deps.ts'
import type { Result } from './failure.ts'
import type { ProductDetail } from './product-detail.ts'
import { hasText } from '@sk/domain/content'
import { mayEditCatalog } from './access.ts'
import { fail, ok } from './failure.ts'
import { checkNewProduct } from './option-rules.ts'
import { checkPhotos, checkVariantPhotos, describe } from './product-detail.ts'
import { seedNewSkus } from './seed-stock.ts'
import { isSkuCode } from './sku-code.ts'

export interface CreateProductInput {
  name: Localized
  text: LocalizedDoc
  photoIds: string[]
  commissionRate: number
  options: OptionInput[]
  variants: VariantInput[]
}

// A new keepsake is a draft with its options and its variants for sale. It needs a name in one language, valid codes (a code is optional),
// and variants that follow the option rules (one value of each option, each combination once, one variant when there
// is no option). A code's uniqueness in the shop is skus_store_sku_code_key, which the route maps to sku-code-taken.
export function makeCreateProduct<T>({ uow, products, media, clock, sales, stockLevels, stock }: CatalogDeps<T>) {
  return async (actor: Actor, storeId: string, input: CreateProductInput, _requestId: string | null): Promise<Result<ProductDetail>> => {
    if (!mayEditCatalog(actor, storeId))
      return fail({ reason: 'forbidden' })
    if (!hasText(input.name))
      return fail({ reason: 'name-required' })
    const badCode = input.variants.findIndex(variant => variant.skuCode !== null && !isSkuCode(variant.skuCode))
    if (badCode >= 0)
      return fail({ reason: 'sku-code-invalid', path: `variants.${badCode}.skuCode` })
    const refusals = checkNewProduct(input.options, input.variants)
    if (refusals.length > 0)
      return fail({ reason: 'refused', refusals })
    return uow.run(async (tx) => {
      const refused = await checkPhotos(media, tx, storeId, input.photoIds)
      if (refused)
        return fail(refused)
      const photoRefused = await checkVariantPhotos(media, tx, storeId, input.variants.map(variant => variant.mediaId))
      if (photoRefused)
        return fail(photoRefused)
      const product = await products.insert(tx, storeId, {
        name: input.name,
        text: input.text,
        media: input.photoIds,
        commissionRate: input.commissionRate,
        options: input.options,
        variants: input.variants,
      }, clock.now())
      await seedNewSkus(stock, tx, actor, storeId, product.variants, input.variants)
      return ok(await describe({ media, sales, stockLevels }, tx, product))
    })
  }
}
