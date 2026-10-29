import type { Localized } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { CategoryKind, CategoryRow } from '../ports.ts'
import type { CategoryDeps } from './category-deps.ts'
import type { Result } from './failure.ts'
import { categorySlugBase, checkNesting, nextFreeSlug, normalizeCategoryName } from '@sk/domain/content'
import { mayManageContent, staffActor } from './access.ts'
import { categoryEntity, siblingsOf } from './category-deps.ts'
import { fail, ok } from './failure.ts'

// The new category goes last among its siblings. Its slug is made once from the name and is never changed.
export function makeCreateCategory<T>({ uow, categories, audit, clock }: CategoryDeps<T>) {
  return async (actor: Actor, storeId: string, kind: CategoryKind, input: { name: { en?: string | null, de?: string | null }, parentId?: string | null }, requestId: string | null): Promise<Result<CategoryRow>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    const name: Localized | undefined = normalizeCategoryName(input.name)
    if (!name)
      return fail({ reason: 'name-missing' })
    const parentId = input.parentId?.toLowerCase() ?? null
    return uow.run(async (tx) => {
      await categories.lockList(tx, storeId, kind)
      const rows = await categories.list(tx, storeId, kind)
      if (parentId !== null) {
        const parent = rows.find(row => row.id === parentId)
        if (!parent)
          return fail({ reason: 'not-found' })
        if (checkNesting({ category: { id: '', parentId: null, childCount: 0 }, target: parent }) !== 'ok')
          return fail({ reason: 'category-too-deep' })
      }
      const slug = nextFreeSlug(categorySlugBase(name), await categories.slugsTaken(tx, storeId, kind))
      const created = await categories.insert(tx, storeId, kind, { name, slug, parentId, position: siblingsOf(rows, parentId).length + 1 }, clock.now())
      await audit.record(tx, {
        storeId,
        actor: staffActor(actor),
        entity: categoryEntity(kind),
        entityId: created.id,
        action: 'created',
        after: { name, slug, parentId, position: created.position },
        requestId,
      })
      return ok(created)
    })
  }
}
