import type { Actor } from '@sk/domain/identity'
import type { OptionsSave } from '../ports.ts'
import type { CatalogDeps } from './deps.ts'
import type { Result } from './failure.ts'
import type { ProductDetail } from './product-detail.ts'
import { mayEditCatalog, staffActor } from './access.ts'
import { fail, ok } from './failure.ts'
import { checkOptionsSave } from './option-rules.ts'
import { describe } from './product-detail.ts'

// The options of a keepsake and the new values of its variants, saved in one write. A save from an old row version is
// refused (412), and so is any save that would leave a variant without a value, two variants on one combination, or a
// value or option that a variant uses deleted (section 7 of the design). A refused save changes nothing.
export function makeSaveOptions<T>({ uow, products, media, audit, clock }: CatalogDeps<T>) {
  return async (actor: Actor, storeId: string, productId: string, ifMatch: number, input: OptionsSave, requestId: string | null): Promise<Result<ProductDetail>> => {
    if (!mayEditCatalog(actor, storeId))
      return fail({ reason: 'forbidden' })
    return uow.run(async (tx) => {
      const product = await products.findForUpdate(tx, storeId, productId)
      if (!product)
        return fail({ reason: 'not-found' })
      if (product.rowVersion !== ifMatch)
        return fail({ reason: 'stale' })
      const refusals = checkOptionsSave(product, input)
      if (refusals.length > 0)
        return fail({ reason: 'refused', refusals })
      const saved = await products.replaceOptions(tx, product, input, clock.now())
      await audit.record(tx, {
        storeId,
        actor: staffActor(actor),
        entity: 'product',
        entityId: product.id,
        action: 'options-saved',
        before: { options: product.options.length, rowVersion: product.rowVersion },
        after: { options: saved.options.length, rowVersion: saved.rowVersion },
        requestId,
      })
      return ok(await describe(media, tx, saved))
    })
  }
}
