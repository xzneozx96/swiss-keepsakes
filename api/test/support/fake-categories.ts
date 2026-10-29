import type { CategoryKind, CategoryRepository, CategoryRow } from '../../src/modules/content/ports.ts'
import { randomUUID } from 'node:crypto'

type Stored = Omit<CategoryRow, 'childCount' | 'useCount'> & { kind: CategoryKind }

// An in-memory category repository. `uses` stands for the pin or story group links, `removeRefused` for a link that
// is added after the count: the database refuses the delete with a RESTRICT foreign key error (23503).
export function createFakeCategories(): CategoryRepository<null> & { rows: Map<string, Stored>, uses: Map<string, number>, removeRefused: Set<string>, locks: string[] } {
  const rows = new Map<string, Stored>()
  const uses = new Map<string, number>()
  const removeRefused = new Set<string>()
  const locks: string[] = []
  const view = (row: Stored): CategoryRow => {
    const { kind: _kind, ...rest } = row
    return { ...rest, childCount: [...rows.values()].filter(r => r.parentId === row.id).length, useCount: uses.get(row.id) ?? 0 }
  }
  const inList = (storeId: string, kind: CategoryKind) => [...rows.values()].filter(r => r.storeId === storeId && r.kind === kind)
  return {
    rows,
    uses,
    removeRefused,
    locks,
    async list(_tx, storeId, kind) {
      return inList(storeId, kind)
        .sort((a, b) => Number(a.parentId !== null) - Number(b.parentId !== null) || a.position - b.position)
        .map(view)
    },
    async lockList(_tx, storeId, kind) {
      locks.push(`${storeId}:${kind}`)
    },
    async find(_tx, storeId, kind, id) {
      const row = rows.get(id)
      return row && row.storeId === storeId && row.kind === kind ? view(row) : undefined
    },
    async slugsTaken(_tx, storeId, kind) {
      return new Set(inList(storeId, kind).map(r => r.slug))
    },
    async insert(_tx, storeId, kind, input) {
      const row: Stored = { id: randomUUID(), storeId, kind, ...input }
      rows.set(row.id, row)
      return view(row)
    },
    async update(_tx, _storeId, _kind, id, changes) {
      const row = { ...rows.get(id)!, ...changes }
      rows.set(id, row)
      return view(row)
    },
    async setPositions(_tx, _storeId, _kind, orderedIds) {
      orderedIds.forEach((id, index) => rows.set(id, { ...rows.get(id)!, position: index + 1 }))
    },
    async remove(_tx, storeId, kind, id) {
      const row = rows.get(id)
      if (!row || row.storeId !== storeId || row.kind !== kind)
        return false
      if (removeRefused.has(id))
        throw Object.assign(new Error('update or delete on table "categories" violates foreign key constraint'), { code: '23503' })
      return rows.delete(id)
    },
  }
}
