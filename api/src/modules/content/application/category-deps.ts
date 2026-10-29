import type { AuditEntry, AuditLog, CategoryKind, CategoryRepository, CategoryRow, Clock, UnitOfWork } from '../ports.ts'
import type { Result } from './failure.ts'

// Runs a unit of work and turns a database refusal that escaped as an exception into a Failure. The composition
// root passes `mappingDatabaseErrors` (adapters/database-errors.ts); an application file may not import an adapter.
export type DatabaseGuard = <V>(work: () => Promise<Result<V>>) => Promise<Result<V>>

export interface CategoryDeps<T> {
  uow: UnitOfWork<T>
  categories: CategoryRepository<T>
  audit: AuditLog<T>
  clock: Clock
  guard: DatabaseGuard
}

export function categoryEntity(kind: CategoryKind): AuditEntry['entity'] {
  return kind === 'map' ? 'map_category' : 'blog_category'
}

export function siblingsOf(rows: CategoryRow[], parentId: string | null): CategoryRow[] {
  return rows.filter(row => row.parentId === parentId).sort((a, b) => a.position - b.position)
}
