import type { MediaInfo, Product, SalesDirectory } from '../ports.ts'
import type { Failure } from './failure.ts'
import { workingDoc } from './product-doc.ts'

// A product with the files its working copy names, in order. A file that no longer exists is left out.
export interface ProductDetail {
  product: Product
  photos: MediaInfo[]
  // The photo of each variant that has one, by variant id. A file that no longer exists is left out.
  variantPhotos: Map<string, MediaInfo>
  // An order line names it, so removing it archives (ADR-023). False when no sales directory is wired.
  hasOrders: boolean
}

export interface MediaLookup<T> {
  find: (tx: T, storeId: string, ids: string[]) => Promise<MediaInfo[]>
}

export async function describe<T>({ media, sales }: { media: MediaLookup<T>, sales?: SalesDirectory<T> }, tx: T, product: Product): Promise<ProductDetail> {
  const ids = workingDoc(product).media
  const variantIds = product.variants.flatMap(variant => variant.mediaId ?? [])
  // One lookup for the keepsake's photos and its variants' photos.
  const found = new Map((await media.find(tx, product.storeId, [...ids, ...variantIds])).map(row => [row.id.toLowerCase(), row]))
  const sold = sales ? await sales.soldProductIds(tx, product.storeId, [product.id]) : new Set<string>()
  const variantPhotos = new Map(product.variants.flatMap((variant) => {
    const photo = variant.mediaId ? found.get(variant.mediaId.toLowerCase()) : undefined

    return photo ? [[variant.id, photo] as const] : []
  }))

  return { product, photos: ids.flatMap(id => found.get(id.toLowerCase()) ?? []), variantPhotos, hasOrders: sold.has(product.id) }
}

// A retired file is reported before an unusable one, so the editor hears first about what it can fix by choosing
// another file. Processing files pass (an upload is saved while the worker runs); publish refuses them.
export async function checkPhotos<T>(media: MediaLookup<T>, tx: T, storeId: string, ids: string[]): Promise<Failure | undefined> {
  if (ids.length === 0)
    return undefined
  const rows = new Map((await media.find(tx, storeId, ids)).map(row => [row.id.toLowerCase(), row]))
  let invalid = false
  for (const id of ids) {
    const row = rows.get(id.toLowerCase())
    if (row?.status === 'retired')
      return { reason: 'media-retired' }
    if (!row || row.kind !== 'image')
      invalid = true
  }
  return invalid ? { reason: 'media-invalid' } : undefined
}

// Publishing puts photos in front of visitors, so a file the worker has not finished is refused.
export async function photosProcessing<T>(media: MediaLookup<T>, tx: T, storeId: string, ids: string[]): Promise<Failure | undefined> {
  if (ids.length === 0)
    return undefined
  const rows = await media.find(tx, storeId, ids)
  const mediaIds = [...new Set(rows.filter(row => row.status === 'processing').map(row => row.id))]
  return mediaIds.length > 0 ? { reason: 'media-processing', mediaIds } : undefined
}

// The photo of a variant must be an image of this store's library and ready: a variant picks a file that is shown at once,
// so a file the worker has not finished is refused, as is a retired one. Nothing to check when no variant names a photo.
export async function checkVariantPhotos<T>(media: MediaLookup<T>, tx: T, storeId: string, ids: (string | null | undefined)[]): Promise<Failure | undefined> {
  const wanted = [...new Set(ids.flatMap(id => id ?? []))]

  if (wanted.length === 0)
    return undefined
  const rows = new Map((await media.find(tx, storeId, wanted)).map(row => [row.id.toLowerCase(), row]))
  const processing: string[] = []

  for (const id of wanted) {
    const row = rows.get(id.toLowerCase())

    if (row?.status === 'retired')
      return { reason: 'media-retired' }
    if (!row || row.kind !== 'image')
      return { reason: 'media-invalid' }
    if (row.status !== 'ready')
      processing.push(row.id)
  }

  return processing.length > 0 ? { reason: 'media-processing', mediaIds: processing } : undefined
}
