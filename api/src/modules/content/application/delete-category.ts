import type { Actor } from '@sk/domain/identity'
import type { CategoryKind } from '../ports.ts'
import type { CategoryDeps } from './category-deps.ts'
import type { Result } from './failure.ts'
import { mayManageContent, staffActor } from './access.ts'
import { categoryEntity, siblingsOf } from './category-deps.ts'
import { fail, ok } from './failure.ts'

// Refused while it has a sub-category, or a pin or story group tagged with it (whatever their status). A link added
// after the count makes the database refuse; `guard` turns that into in-use, which is category-in-use here.
export function makeDeleteCategory<T>({ uow, categories, audit, clock, guard }: CategoryDeps<T>) {
  return async (actor: Actor, storeId: string, kind: CategoryKind, id: string, requestId: string | null): Promise<Result<{ id: string }>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    const categoryId = id.toLowerCase()
    const result = await guard(() => uow.run(async (tx): Promise<Result<{ id: string }>> => {
      await categories.lockList(tx, storeId, kind)
      const rows = await categories.list(tx, storeId, kind)
      const category = rows.find(row => row.id === categoryId)
      if (!category)
        return fail({ reason: 'not-found' })
      if (category.childCount > 0)
        return fail({ reason: 'category-has-children' })
      if (category.useCount > 0)
        return fail({ reason: 'category-in-use' })
      if (!(await categories.remove(tx, storeId, kind, categoryId)))
        return fail({ reason: 'not-found' })
      await categories.setPositions(tx, storeId, kind, siblingsOf(rows, category.parentId).filter(row => row.id !== categoryId).map(row => row.id), clock.now())
      await audit.record(tx, {
        storeId,
        actor: staffActor(actor),
        entity: categoryEntity(kind),
        entityId: categoryId,
        action: 'deleted',
        before: { name: category.name, slug: category.slug, parentId: category.parentId },
        requestId,
      })
      return ok({ id: categoryId })
    }))
    return !result.ok && result.reason === 'in-use' ? fail({ reason: 'category-in-use' }) : result
  }
}
