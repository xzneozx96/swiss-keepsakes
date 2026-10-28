import type { MediaRecord, MediaRepository } from '../../src/modules/content/ports.ts'

export type FakeMedia = MediaRepository<null> & {
  rows: Map<string, MediaRecord>
  // Ids that isReferenced answers true for.
  referenced: Set<string>
  retiredAt: Map<string, Date>
}

// An in-memory media repository: the five write-side methods and `find`, none of the table's CHECKs.
export function createFakeMedia(seed: MediaRecord[] = []): FakeMedia {
  const rows = new Map<string, MediaRecord>(seed.map(row => [row.id, row]))
  const referenced = new Set<string>()
  const retiredAt = new Map<string, Date>()
  const own = (storeId: string, id: string) => {
    const row = rows.get(id)
    return row?.storeId === storeId ? row : undefined
  }
  const store = (row: MediaRecord) => {
    rows.set(row.id, row)
    return row
  }
  return {
    rows,
    referenced,
    retiredAt,
    async find(_tx, storeId, ids) {
      return ids.flatMap((id) => {
        const row = own(storeId, id)
        return row ? [row] : []
      })
    },
    async insert(_tx, row) {
      return store({ ...row, width: null, height: null, status: 'processing' })
    },
    async findById(_tx, storeId, id) {
      return own(storeId, id)
    },
    async markReady(_tx, row, dims) {
      return store({ ...row, width: dims?.width ?? null, height: dims?.height ?? null, status: 'ready' })
    },
    async retire(_tx, row, at) {
      retiredAt.set(row.id, at)
      return store({ ...row, status: 'retired' })
    },
    async isReferenced(_tx, _storeId, mediaId) {
      return referenced.has(mediaId)
    },
  }
}
