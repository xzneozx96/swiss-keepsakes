import type { Actor } from '@sk/domain/identity'
import type { CatalogDeps } from './deps.ts'
import type { Result } from './failure.ts'
import type { ProductDetail } from './product-detail.ts'
import { mayEditCatalog, staffActor } from './access.ts'
import { fail, ok } from './failure.ts'
import { checkPhotos, describe, photosProcessing } from './product-detail.ts'
import { workingDoc } from './product-doc.ts'
import { publishChecks, publishGaps } from './publish-checks.ts'
import { productSlug } from './slug.ts'

// The working copy goes live. The blocking checks of the publish card are the write validation: a full language
// (AC30), a photo and a variant for sale. A photo retired or removed since the save is refused again here. A keepsake that was unpublished and has no pending edit goes live again
// with the text it had.
export function makePublishProduct<T>({ uow, products, media, audit, clock }: CatalogDeps<T>) {
  return async (actor: Actor, storeId: string, productId: string, ifMatch: number, requestId: string | null): Promise<Result<ProductDetail>> => {
    if (!mayEditCatalog(actor, storeId))
      return fail({ reason: 'forbidden' })
    return uow.run(async (tx) => {
      const product = await products.findForUpdate(tx, storeId, productId)
      if (!product)
        return fail({ reason: 'not-found' })
      if (product.rowVersion !== ifMatch)
        return fail({ reason: 'stale' })
      const doc = workingDoc(product)
      const gaps = publishGaps(publishChecks({ doc, variants: product.variants, options: product.options, commissionRate: product.commissionRate }))
      if (gaps.length > 0)
        return fail({ reason: 'incomplete', gaps })
      const refused = await checkPhotos(media, tx, storeId, doc.media)
      if (refused)
        return fail(refused)
      const processing = await photosProcessing(media, tx, storeId, doc.media)
      if (processing)
        return fail(processing)
      const slug = productSlug({
        stored: product.slug,
        name: doc.name,
        taken: { en: await products.slugsTaken(tx, 'en'), de: await products.slugsTaken(tx, 'de') },
      })
      const published = await products.publish(tx, product, slug, clock.now())
      await audit.record(tx, {
        storeId,
        actor: staffActor(actor),
        entity: 'product',
        entityId: product.id,
        action: 'published',
        before: { status: product.status },
        after: { status: 'published', rowVersion: published.rowVersion },
        requestId,
      })
      return ok(await describe(media, tx, published))
    })
  }
}
