import type { MediaRecord, MediaRepository } from '../../src/modules/content/ports.ts'

// The columns of a media row that the library added (E4.11), for a test row that only cares about the others.
export const mediaDefaults = { name: 'file.jpg', fileName: 'file.jpg', alt: {}, durationSeconds: null, version: 1, createdAt: new Date('2026-10-28T09:00:00Z') } as const

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
    async insert(_tx, row, at) {
      const name = row.name ?? `${row.kind}-${row.id.slice(0, 8)}`
      return store({ ...mediaDefaults, ...row, name, fileName: row.fileName ?? name, createdAt: at, width: null, height: null, status: 'processing' })
    },
    async describe(_tx, row, changes) {
      if (!own(row.storeId, row.id))
        return undefined
      const alt = { ...row.alt }
      for (const language of ['en', 'de'] as const) {
        const text = changes.alt?.[language]
        if (text === undefined)
          continue
        if (text === '')
          delete alt[language]
        else
          alt[language] = text
      }
      return store({ ...row, name: changes.name ?? row.name, alt })
    },
    async replace(_tx, row, next) {
      if (!own(row.storeId, row.id))
        return undefined
      return store({ ...row, ...next, version: row.version + 1 })
    },
    async findById(_tx, storeId, id) {
      return own(storeId, id)
    },
    async markReady(_tx, row, dims) {
      if (!own(row.storeId, row.id))
        return undefined
      return store({ ...row, width: dims?.width ?? null, height: dims?.height ?? null, status: 'ready' })
    },
    async retire(_tx, row, at) {
      if (!own(row.storeId, row.id))
        return undefined
      retiredAt.set(row.id, at)
      return store({ ...row, status: 'retired' })
    },
    async isReferenced(_tx, _storeId, mediaId) {
      return referenced.has(mediaId)
    },
  }
}
