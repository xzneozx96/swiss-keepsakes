import type { MediaDirectory, MediaInfo } from '../ports.ts'

// Keepsake photos are plain media ids (ADR-013), so the catalog never reads the content module's table. The
// composition root hands this adapter the two things it needs: a lookup of the rows of this store, and the function that
// turns a row into the shape the API sends. One query reads all the ids of a store, so a list of cards costs one
// lookup per store.
export function createMediaDirectory<T, R>(source: {
  findMany: (tx: T, storeId: string, ids: string[]) => Promise<R[]>
  view: (row: R) => MediaInfo
}): MediaDirectory<T> {
  return {
    async find(tx, storeId, ids) {
      const unique = [...new Set(ids)]
      return unique.length === 0 ? [] : (await source.findMany(tx, storeId, unique)).map(source.view)
    },
  }
}
