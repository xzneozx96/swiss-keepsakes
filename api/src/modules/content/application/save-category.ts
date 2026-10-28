import type { Localized } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { CategoryKind, CategoryRow } from '../ports.ts'
import type { CategoryDeps } from './category-deps.ts'
import type { Result } from './failure.ts'
import { checkNesting, normalizeCategoryName } from '@sk/domain/content'
import { mayManageContent, staffActor } from './access.ts'
import { categoryEntity, siblingsOf } from './category-deps.ts'
import { fail, ok } from './failure.ts'

// A name replaces both languages; the slug stays. A changed parent appends the category last under the new parent
// and closes the gap it leaves in the old group. A category named as its own parent is refused as too deep.
export function makeSaveCategory<T>({ uow, categories, audit, clock }: CategoryDeps<T>) {
  return async (actor: Actor, storeId: string, kind: CategoryKind, id: string, input: { name?: { en?: string | null, de?: string | null }, parentId?: string | null }, requestId: string | null): Promise<Result<CategoryRow>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    let name: Localized | undefined
    if (input.name !== undefined) {
      name = normalizeCategoryName(input.name)
      if (!name)
        return fail({ reason: 'name-missing' })
    }
    const categoryId = id.toLowerCase()
    const parentId = input.parentId === undefined ? undefined : (input.parentId?.toLowerCase() ?? null)
    return uow.run(async (tx) => {
      await categories.lockList(tx, storeId, kind)
      const rows = await categories.list(tx, storeId, kind)
      const category = rows.find(row => row.id === categoryId)
      if (!category)
        return fail({ reason: 'not-found' })
      const changes: { name?: Localized, parentId?: string | null, position?: number } = {}
      if (name)
        changes.name = name
      let oldSiblings: CategoryRow[] | undefined
      if (parentId !== undefined && parentId !== category.parentId) {
        const target = parentId === null ? null : rows.find(row => row.id === parentId)
        if (target === undefined)
          return fail({ reason: 'not-found' })
        const verdict = checkNesting({ category, target })
        if (verdict === 'too-deep' || verdict === 'own-parent')
          return fail({ reason: 'category-too-deep' })
        if (verdict === 'has-children')
          return fail({ reason: 'category-parent-has-children' })
        changes.parentId = parentId
        changes.position = siblingsOf(rows, parentId).length + 1
        oldSiblings = siblingsOf(rows, category.parentId).filter(row => row.id !== category.id)
      }
      const at = clock.now()
      const saved = await categories.update(tx, storeId, kind, categoryId, changes, at)
      if (oldSiblings)
        await categories.setPositions(tx, storeId, kind, oldSiblings.map(row => row.id), at)
      await audit.record(tx, {
        storeId,
        actor: staffActor(actor),
        entity: categoryEntity(kind),
        entityId: categoryId,
        action: 'updated',
        before: { name: category.name, parentId: category.parentId, position: category.position },
        after: { name: saved.name, parentId: saved.parentId, position: saved.position },
        requestId,
      })
      return ok(saved)
    })
  }
}
