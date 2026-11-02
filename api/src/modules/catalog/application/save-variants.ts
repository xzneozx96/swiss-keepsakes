import type { Actor } from '@sk/domain/identity'
import type { Refusal, VariantBatchChange } from '../ports.ts'
import type { CatalogDeps } from './deps.ts'
import type { Result } from './failure.ts'
import type { ProductDetail } from './product-detail.ts'
import { mayEditCatalog, staffActor } from './access.ts'
import { fail, ok } from './failure.ts'
import { variantName } from './option-rules.ts'
import { checkVariantPhotos, describe } from './product-detail.ts'
import { isSkuCode } from './sku-code.ts'

// The price or status of several variants of one keepsake, all or nothing, with the rules of `saveVariant`: live at
// once (no row version, ADR-014), archived is final, an archived variant can't be changed, and archiving is refused
// while open orders reserve units. A row may also set or clear (null) the code and the photo; a code is checked as one variant's is. A variant that is not this keepsake's is not found, and nothing is written.
export function makeSaveVariants<T>({ uow, products, media, audit, clock, reservations, sales }: CatalogDeps<T>) {
  return async (actor: Actor, storeId: string, productId: string, changes: VariantBatchChange[], requestId: string | null): Promise<Result<ProductDetail>> => {
    if (!mayEditCatalog(actor, storeId))
      return fail({ reason: 'forbidden' })
    const badCode = changes.findIndex(change => change.skuCode !== undefined && change.skuCode !== null && !isSkuCode(change.skuCode))
    if (badCode >= 0)
      return fail({ reason: 'sku-code-invalid', path: `variants.${badCode}.skuCode` })
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
          refusals.push({ code: 'variant-archived', path: `variants.${index}.status`, params: { code: variantName(variant, product.options) } })
      })
      const archiving = changes.filter(change => change.status === 'archived' && byId.get(change.id)!.status !== 'archived')
      if (archiving.length > 0 && reservations) {
        const reserved = await reservations.reservedBySku(tx, storeId, archiving.map(change => change.id))
        changes.forEach((change, index) => {
          const count = reserved.get(change.id) ?? 0

          if (change.status === 'archived' && count > 0)
            refusals.push({ code: 'variant-reserved', path: `variants.${index}.status`, params: { code: variantName(byId.get(change.id)!, product.options), count } })
        })
      }
      const codes = changes.map(change => change.skuCode ?? null)
      codes.forEach((code, index) => {
        if (code !== null && codes.slice(0, index).some(other => other?.toLowerCase() === code.toLowerCase()))
          refusals.push({ code: 'code-duplicate', path: `variants.${index}.skuCode`, params: { code } })
      })
      // A code the rows give up (or keep) is not taken by its own row; the shop's other codes are the database's.
      const present = codes.flatMap(code => code ?? [])
      const taken = await products.takenSkuCodes(tx, storeId, present, changes.filter(change => change.skuCode !== undefined).map(change => change.id))
      codes.forEach((code, index) => {
        if (code !== null && taken.has(code))
          refusals.push({ code: 'code-taken', path: `variants.${index}.skuCode`, params: { code } })
      })
      if (refusals.length > 0)
        return fail({ reason: 'refused', refusals })
      const photoRefused = await checkVariantPhotos(media, tx, storeId, changes.map(change => change.mediaId))
      if (photoRefused)
        return fail(photoRefused)
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
