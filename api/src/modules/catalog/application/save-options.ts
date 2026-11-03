import type { Actor } from '@sk/domain/identity'
import type { OptionsSave } from '../ports.ts'
import type { CatalogDeps } from './deps.ts'
import type { Result } from './failure.ts'
import type { ProductDetail } from './product-detail.ts'
import { mayEditCatalog, staffActor } from './access.ts'
import { fail, ok } from './failure.ts'
import { checkOptionsSave } from './option-rules.ts'
import { checkVariantPhotos, describe } from './product-detail.ts'
import { newVariantsOf, seedNewSkus } from './seed-stock.ts'
import { isSkuCode } from './sku-code.ts'

// The options of a keepsake, the new values of its variants and its new variants, saved in one write. A save from an old
// row version is refused (412), and so is any save that would leave a variant without a value, two variants on one
// combination, or a value or option that a variant uses deleted (section 7 of the design). A new variant is for sale
// and takes a combination and, when it has a code, a code that nothing else holds. A refused save changes nothing.
export function makeSaveOptions<T>({ uow, products, media, audit, clock, sales, stockLevels, stock }: CatalogDeps<T>) {
  return async (actor: Actor, storeId: string, productId: string, ifMatch: number, input: OptionsSave, requestId: string | null): Promise<Result<ProductDetail>> => {
    if (!mayEditCatalog(actor, storeId))
      return fail({ reason: 'forbidden' })
    return uow.run(async (tx) => {
      const product = await products.findForUpdate(tx, storeId, productId)
      if (!product)
        return fail({ reason: 'not-found' })
      if (product.rowVersion !== ifMatch)
        return fail({ reason: 'stale' })
      if (product.status === 'archived')
        return fail({ reason: 'archived' })
      const badCode = input.newVariants.findIndex(variant => variant.skuCode !== null && !isSkuCode(variant.skuCode))
      if (badCode >= 0)
        return fail({ reason: 'sku-code-invalid', path: `newVariants.${badCode}.skuCode` })
      const dropping = product.options.some(option => !input.options.some(next => next.ref === option.id))
      const archived = product.variants.filter(variant => variant.status === 'archived').map(variant => variant.id)
      const sold = sales && dropping && archived.length > 0 ? await sales.soldSkuIds(tx, storeId, archived) : new Set<string>()
      const refusals = checkOptionsSave(product, input, sold)
      // The shop's codes are the database's (skus_store_sku_code_key); asking first lets the answer name the row.
      const taken = await products.takenSkuCodes(tx, storeId, input.newVariants.flatMap(variant => variant.skuCode ?? []))
      input.newVariants.forEach((variant, index) => {
        if (variant.skuCode !== null && taken.has(variant.skuCode))
          refusals.push({ code: 'code-taken', path: `newVariants.${index}.skuCode`, params: { code: variant.skuCode } })
      })
      if (refusals.length > 0)
        return fail({ reason: 'refused', refusals })
      const photoRefused = await checkVariantPhotos(media, tx, storeId, input.newVariants.map(variant => variant.mediaId))
      if (photoRefused)
        return fail(photoRefused)
      const saved = await products.replaceOptions(tx, product, input, clock.now())
      await seedNewSkus(stock, tx, actor, storeId, newVariantsOf(product, saved), input.newVariants)
      await audit.record(tx, {
        storeId,
        actor: staffActor(actor),
        entity: 'product',
        entityId: product.id,
        action: 'options-saved',
        before: { options: product.options.length, variants: product.variants.length, rowVersion: product.rowVersion },
        after: { options: saved.options.length, variants: saved.variants.length, rowVersion: saved.rowVersion },
        requestId,
      })
      return ok(await describe({ media, sales, stockLevels }, tx, saved))
    })
  }
}
