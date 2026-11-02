import type { Actor } from '@sk/domain/identity'
import type { Refusal, VariantBatchChange } from '../ports.ts'
import type { CatalogDeps } from './deps.ts'
import type { Result } from './failure.ts'
import type { ProductDetail } from './product-detail.ts'
import { mayEditCatalog, staffActor } from './access.ts'
import { fail, ok } from './failure.ts'
import { describe } from './product-detail.ts'

// The price or status of several variants of one keepsake, all or nothing, with the rules of `saveVariant`: live at
// once (no row version, ADR-014), archived is final, an archived variant can't be changed, and archiving is refused
// while open orders reserve units. A variant that is not this keepsake's is not found, and nothing is written.
export function makeSaveVariants<T>({ uow, products, media, audit, clock, reservations, sales }: CatalogDeps<T>) {
  return async (actor: Actor, storeId: string, productId: string, changes: VariantBatchChange[], requestId: string | null): Promise<Result<ProductDetail>> => {
    if (!mayEditCatalog(actor, storeId))
      return fail({ reason: 'forbidden' })
    return uow.run(async (tx) => {
      const product = await products.findForUpdate(tx, storeId, productId)
      if (!product)
        return fail({ reason: 'not-found' })
      if (product.status === 'archived')
        return fail({ reason: 'archived' })
      const byId = new Map(product.variants.map(variant => [variant.id, variant]))
      if (changes.some(change => !byId.has(change.id)))
        return fail({ reason: 'not-found' })
      const refusals: Refusal[] = []
      changes.forEach((change, index) => {
        const variant = byId.get(change.id)!

        if (variant.status === 'archived')
          refusals.push({ code: 'variant-archived', path: `variants.${index}.status`, params: { code: variant.skuCode } })
      })
      const archiving = changes.filter(change => change.status === 'archived' && byId.get(change.id)!.status !== 'archived')
      if (archiving.length > 0 && reservations) {
        const reserved = await reservations.reservedBySku(tx, storeId, archiving.map(change => change.id))
        changes.forEach((change, index) => {
          const count = reserved.get(change.id) ?? 0

          if (change.status === 'archived' && count > 0)
            refusals.push({ code: 'variant-reserved', path: `variants.${index}.status`, params: { code: byId.get(change.id)!.skuCode, count } })
        })
      }
      if (refusals.length > 0)
        return fail({ reason: 'refused', refusals })
      const saved = await products.saveVariants(tx, product, changes, clock.now())
      await Promise.all(archiving.map(change => audit.record(tx, {
        storeId,
        actor: staffActor(actor),
        entity: 'sku',
        entityId: change.id,
        action: 'archived',
        before: { status: byId.get(change.id)!.status },
        after: { status: 'archived' },
        requestId,
      })))
      return ok(await describe({ media, sales }, tx, saved))
    })
  }
}
