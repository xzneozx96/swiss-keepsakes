import type { MediaInfo, Product } from '../ports.ts'
import type { Failure } from './failure.ts'
import { workingDoc } from './product-doc.ts'

// A product with the files its working copy names, in order. A file that no longer exists is left out.
export interface ProductDetail {
  product: Product
  photos: MediaInfo[]
}

export interface MediaLookup<T> {
  find: (tx: T, storeId: string, ids: string[]) => Promise<MediaInfo[]>
}

export async function describe<T>(media: MediaLookup<T>, tx: T, product: Product): Promise<ProductDetail> {
  const ids = workingDoc(product).media
  const found = new Map((await media.find(tx, product.storeId, ids)).map(row => [row.id.toLowerCase(), row]))
  return { product, photos: ids.flatMap(id => found.get(id.toLowerCase()) ?? []) }
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
