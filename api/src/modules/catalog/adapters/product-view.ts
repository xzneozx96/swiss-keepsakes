import type { ProductListItem, Product as ProductView } from '@sk/api-contract'
import type { ProductListEntry } from '../application/list-products.ts'
import type { ProductDetail } from '../application/product-detail.ts'
import { hasUnpublishedEdits, workingDoc } from '../application/product-doc.ts'
import { publishChecks } from '../application/publish-checks.ts'

// The response shape of a keepsake: the dates as ISO strings, the working copy, and the publish checks computed from it.
export function productView({ product, photos, variantPhotos, hasOrders, soldSkuIds, stock }: ProductDetail): ProductView {
  const doc = workingDoc(product)
  const checks = publishChecks({ doc, variants: product.variants, options: product.options, commissionRate: product.commissionRate })
  return {
    id: product.id,
    storeId: product.storeId,
    status: product.status,
    name: doc.name,
    // The contract's view of a stored description is a document of nodes; a stored one was checked when it was written.
    text: doc.text as ProductView['text'],
    photos,
    commissionRate: product.commissionRate,
    slug: product.slug,
    hasUnpublishedEdits: hasUnpublishedEdits(product),
    hasOrders,
    options: product.options,
    variants: product.variants.map(({ id, skuCode, mediaId, priceRappen, status, values }) => {
      const { onHand, reserved } = stock.get(id) ?? { onHand: 0, reserved: 0 }

      return { id, skuCode, mediaId, photo: variantPhotos.get(id) ?? null, priceRappen, status, values, hasOrders: soldSkuIds.has(id), onHand, reserved, available: onHand - reserved }
    }),
    blocking: checks.blocking,
    warnings: checks.warnings,
    rowVersion: product.rowVersion,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  }
}

export function productListItemView({ row, cover, hasOrders, soldOutCount }: ProductListEntry): ProductListItem {
  return {
    id: row.id,
    name: row.name,
    optionNames: row.optionNames,
    status: row.status,
    hasUnpublishedEdits: row.hasUnpublishedEdits,
    cover,
    variantCount: row.variantCount,
    soldOutCount,
    hasOrders,
    rowVersion: row.rowVersion,
    updatedAt: row.updatedAt.toISOString(),
  }
}
