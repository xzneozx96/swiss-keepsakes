import type { Actor } from '@sk/domain/identity'
import type { CatalogDeps } from './deps.ts'
import type { Result } from './failure.ts'
import { mayEditCatalog, staffActor } from './access.ts'
import { fail, ok } from './failure.ts'

export interface ProductRemoval {
  id: string
  outcome: 'deleted' | 'archived'
}

// Removing a keepsake (owner decision 2026-11-01): one that no order line names is deleted for good, with its options and
// variants (its photos stay in the library); one that has orders is archived, so its orders keep working. Archiving is
// final. Without a sales directory (the orders module is not built) nothing counts as sold.
export function makeDeleteProduct<T>({ uow, products, audit, clock, sales }: CatalogDeps<T>) {
  return async (actor: Actor, storeId: string, productId: string, ifMatch: number, requestId: string | null): Promise<Result<ProductRemoval>> => {
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
      const sold = sales ? (await sales.soldProductIds(tx, storeId, [productId])).has(productId) : false
      if (sold) {
        const archived = await products.archive(tx, product, clock.now())
        await audit.record(tx, {
          storeId,
          actor: staffActor(actor),
          entity: 'product',
          entityId: productId,
          action: 'archived',
          before: { status: product.status },
          after: { status: 'archived', rowVersion: archived.rowVersion },
          requestId,
        })
        return ok({ id: productId, outcome: 'archived' })
      }
      await products.remove(tx, product)
      await audit.record(tx, {
        storeId,
        actor: staffActor(actor),
        entity: 'product',
        entityId: productId,
        action: 'deleted',
        before: { status: product.status, name: product.draft?.name ?? product.published?.name ?? {} },
        requestId,
      })
      return ok({ id: productId, outcome: 'deleted' })
    })
  }
}
