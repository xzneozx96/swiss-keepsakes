import type { Actor } from '@sk/domain/identity'
import type { CatalogDeps } from './deps.ts'
import type { Result } from './failure.ts'
import type { ProductDetail } from './product-detail.ts'
import { mayEditCatalog, staffActor } from './access.ts'
import { fail, ok } from './failure.ts'
import { describe } from './product-detail.ts'

// Guests stop seeing the keepsake at once. Open orders are not touched, and the live text stays for a later publish.
export function makeUnpublishProduct<T>({ uow, products, media, audit, clock }: CatalogDeps<T>) {
  return async (actor: Actor, storeId: string, productId: string, ifMatch: number, requestId: string | null): Promise<Result<ProductDetail>> => {
    if (!mayEditCatalog(actor, storeId))
      return fail({ reason: 'forbidden' })
    return uow.run(async (tx) => {
      const product = await products.findForUpdate(tx, storeId, productId)
      if (!product)
        return fail({ reason: 'not-found' })
      if (product.rowVersion !== ifMatch)
        return fail({ reason: 'stale' })
      if (product.status !== 'published')
        return fail({ reason: 'not-published' })
      const draft = await products.unpublish(tx, product, clock.now())
      await audit.record(tx, {
        storeId,
        actor: staffActor(actor),
        entity: 'product',
        entityId: product.id,
        action: 'unpublished',
        before: { status: 'published' },
        after: { status: 'draft', rowVersion: draft.rowVersion },
        requestId,
      })
      return ok(await describe(media, tx, draft))
    })
  }
}
