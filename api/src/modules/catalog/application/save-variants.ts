import type { Actor } from '@sk/domain/identity'
import type { Refusal, VariantBatchChange, VariantBatchRequest } from '../ports.ts'
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
// while open orders reserve units. A row set to removed (owner, 2026-11-02) is deleted when no order line names its variant and archived when one does; the rest of such a row is ignored. A row may also set or clear (null) the code and the photo; a code is checked as one variant's is. A variant that is not this keepsake's is not found, and nothing is written.
export function makeSaveVariants<T>({ uow, products, media, audit, clock, reservations, sales }: CatalogDeps<T>) {
  return async (actor: Actor, storeId: string, productId: string, requests: VariantBatchRequest[], requestId: string | null): Promise<Result<ProductDetail>> => {
    if (!mayEditCatalog(actor, storeId))
      return fail({ reason: 'forbidden' })
    const badCode = requests.findIndex(change => change.skuCode !== undefined && change.skuCode !== null && !isSkuCode(change.skuCode))
    if (badCode >= 0)
      return fail({ reason: 'sku-code-invalid', path: `variants.${badCode}.skuCode` })
    return uow.run(async (tx) => {
      const product = await products.findForUpdate(tx, storeId, productId)
      if (!product)
        return fail({ reason: 'not-found' })
      if (product.status === 'archived')
        return fail({ reason: 'archived' })
      const byId = new Map(product.variants.map(variant => [variant.id, variant]))
      if (requests.some(change => !byId.has(change.id)))
        return fail({ reason: 'not-found' })
      // Removed rows are told apart by the sales directory: unsold ones are deleted, the others are archived like any archive.
      const askedToRemove = requests.filter(change => change.status === 'removed').map(change => change.id)
      const soldIds = sales && askedToRemove.length > 0 ? await sales.soldSkuIds(tx, storeId, askedToRemove) : new Set<string>()
      const deleting = new Set(askedToRemove.filter(id => !soldIds.has(id)))
      // The rows as the rules see them, in the request's order so that a refusal names its row: a removal is an archive.
      const changes = requests.map((change): VariantBatchChange => (change.status === 'removed' ? { id: change.id, status: 'archived' } : (change as VariantBatchChange)))
      const refusals: Refusal[] = []
      changes.forEach((change, index) => {
        const variant = byId.get(change.id)!

        // An archived variant may only be removed, and only when no order line names it.
        if (variant.status === 'archived' && !(requests[index]!.status === 'removed' && deleting.has(change.id)))
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
      const writing = changes.filter(change => !deleting.has(change.id))
      // Unsold variants go first, then the price, status, code and photo changes, in the one transaction.
      let saved = deleting.size > 0 ? await products.removeVariants(tx, product, [...deleting]) : product
      if (writing.length > 0)
        saved = await products.saveVariants(tx, saved, writing, clock.now())
      await Promise.all([
        ...Array.from(deleting, id => audit.record(tx, {
          storeId,
          actor: staffActor(actor),
          entity: 'sku',
          entityId: id,
          action: 'deleted',
          before: { status: byId.get(id)!.status, skuCode: byId.get(id)!.skuCode },
          requestId,
        })),
        ...archiving.filter(change => !deleting.has(change.id)).map(change => audit.record(tx, {
          storeId,
          actor: staffActor(actor),
          entity: 'sku',
          entityId: change.id,
          action: 'archived',
          before: { status: byId.get(change.id)!.status },
          after: { status: 'archived' },
          requestId,
        })),
      ])
      return ok(await describe({ media, sales }, tx, saved))
    })
  }
}
