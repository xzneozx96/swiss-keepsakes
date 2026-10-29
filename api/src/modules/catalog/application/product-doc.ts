import type { Product, ProductDoc } from '../ports.ts'

// What the editor shows and the checks read: the pending draft, else the live text with its photos.
export function workingDoc(product: Pick<Product, 'draft' | 'published' | 'publishedMedia'>): ProductDoc {
  if (product.draft)
    return product.draft
  return { name: product.published?.name ?? {}, text: product.published?.text ?? {}, media: product.publishedMedia }
}

export function hasUnpublishedEdits(product: Pick<Product, 'status' | 'draft'>): boolean {
  return product.status === 'published' && product.draft !== null
}
