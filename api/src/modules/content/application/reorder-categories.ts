import type { Actor } from '@sk/domain/identity'
import type { CategoryKind, CategoryRow } from '../ports.ts'
import type { CategoryDeps } from './category-deps.ts'
import type { Result } from './failure.ts'
import { mayManageContent, staffActor } from './access.ts'
import { categoryEntity, siblingsOf } from './category-deps.ts'
import { fail, ok } from './failure.ts'

// `ids` must be exactly the current siblings under the parent: same length and same set, so [a, a] never passes for [a].
export function makeReorderCategories<T>({ uow, categories, audit, clock }: CategoryDeps<T>) {
  return async (actor: Actor, storeId: string, kind: CategoryKind, input: { parentId: string | null, ids: string[] }, requestId: string | null): Promise<Result<CategoryRow[]>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    const parentId = input.parentId?.toLowerCase() ?? null
    const ids = input.ids.map(id => id.toLowerCase())
    return uow.run(async (tx) => {
      await categories.lockList(tx, storeId, kind)
      const rows = await categories.list(tx, storeId, kind)
      if (parentId !== null && !rows.some(row => row.id === parentId))
        return fail({ reason: 'not-found' })
      const current = siblingsOf(rows, parentId).map(row => row.id)
      const wanted = new Set(ids)
      if (ids.length !== current.length || wanted.size !== current.length || !current.every(id => wanted.has(id)))
        return fail({ reason: 'order-mismatch' })
      await categories.setPositions(tx, storeId, kind, ids, clock.now())
      await audit.record(tx, {
        storeId,
        actor: staffActor(actor),
        entity: categoryEntity(kind),
        entityId: parentId ?? storeId,
        action: 'reordered',
        before: { parentId, ids: current },
        after: { parentId, ids },
        requestId,
      })
      return ok(await categories.list(tx, storeId, kind))
    })
  }
}
