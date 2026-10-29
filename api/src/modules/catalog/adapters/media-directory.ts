import type { MediaDirectory, MediaInfo } from '../ports.ts'

// Keepsake photos are plain media ids (ADR-013), so the catalog never reads the content module's table. The
// composition root hands this adapter the two things it needs: a lookup of one row of this store, and the function that
// turns a row into the shape the API sends.
export function createMediaDirectory<T, R>(source: {
  findById: (tx: T, storeId: string, id: string) => Promise<R | undefined>
  view: (row: R) => MediaInfo
}): MediaDirectory<T> {
  return {
    async find(tx, storeId, ids) {
      const found: MediaInfo[] = []
      for (const id of new Set(ids)) {
        const row = await source.findById(tx, storeId, id)
        if (row)
          found.push(source.view(row))
      }
      return found
    },
  }
}
