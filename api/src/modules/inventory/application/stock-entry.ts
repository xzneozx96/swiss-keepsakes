import type { LiveSku, MediaDirectory, MediaInfo, StockLevel } from '../ports.ts'

// One live variant with its stock and its photo.
export interface StockEntry {
  sku: LiveSku
  onHand: number
  reserved: number
  // onHand - reserved. The database CHECK keeps it from going below 0.
  available: number
  photo: MediaInfo | null
}

export const entryOf = (sku: LiveSku, level: Pick<StockLevel, 'onHand' | 'reserved'> | undefined, photo: MediaInfo | null = null): StockEntry => {
  const onHand = level?.onHand ?? 0
  const reserved = level?.reserved ?? 0

  return { sku, onHand, reserved, available: onHand - reserved, photo }
}

// The variant's photo, else the keepsake's first. A file of another store or one that is gone leaves no photo.
export async function withPhotos<T, E extends { sku: LiveSku }>(media: MediaDirectory<T>, tx: T, storeId: string, entries: E[]): Promise<(E & { photo: MediaInfo | null })[]> {
  const ids = [...new Set(entries.flatMap(({ sku }) => sku.mediaId ?? sku.keepsakePhotoId ?? []))]
  const found = new Map((ids.length > 0 ? await media.find(tx, storeId, ids) : []).map(file => [file.id.toLowerCase(), file]))

  return entries.map((entry) => {
    const id = entry.sku.mediaId ?? entry.sku.keepsakePhotoId

    return { ...entry, photo: id ? found.get(id.toLowerCase()) ?? null : null }
  })
}
