import type { Actor } from '@sk/domain/identity'
import type { ProductChanges } from '../ports.ts'
import type { CatalogDeps } from './deps.ts'
import type { Result } from './failure.ts'
import type { ProductDetail } from './product-detail.ts'
import { mayEditCatalog } from './access.ts'
import { fail, ok } from './failure.ts'
import { checkPhotos, describe } from './product-detail.ts'

// The autosave. A save replaces the draft document, so a published keepsake keeps the guests' copy until the next
// publish. An old row version is refused (412) and changes nothing. Photos are checked at save, not at publish.
export function makeSaveProduct<T>({ uow, products, media, clock }: CatalogDeps<T>) {
  return async (actor: Actor, storeId: string, productId: string, ifMatch: number, changes: ProductChanges, _requestId: string | null): Promise<Result<ProductDetail>> => {
    if (!mayEditCatalog(actor, storeId))
      return fail({ reason: 'forbidden' })
    return uow.run(async (tx) => {
      const product = await products.findForUpdate(tx, storeId, productId)
      if (!product)
        return fail({ reason: 'not-found' })
      if (product.rowVersion !== ifMatch)
        return fail({ reason: 'stale' })
      if (changes.media) {
        const refused = await checkPhotos(media, tx, storeId, changes.media)
        if (refused)
          return fail(refused)
      }
      return ok(await describe(media, tx, await products.save(tx, product, changes, clock.now())))
    })
  }
}
