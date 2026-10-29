import type { AuditEntry, AuditLog, CategoryKind, CategoryRepository, CategoryRow, Clock, UnitOfWork } from '../ports.ts'

export interface CategoryDeps<T> {
  uow: UnitOfWork<T>
  categories: CategoryRepository<T>
  audit: AuditLog<T>
  clock: Clock
}

export function categoryEntity(kind: CategoryKind): AuditEntry['entity'] {
  return kind === 'map' ? 'map_category' : 'blog_category'
}

export function siblingsOf(rows: CategoryRow[], parentId: string | null): CategoryRow[] {
  return rows.filter(row => row.parentId === parentId).sort((a, b) => a.position - b.position)
}
