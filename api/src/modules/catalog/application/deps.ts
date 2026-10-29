import type { AuditLog, Clock, MediaDirectory, ProductRepository, UnitOfWork } from '../ports.ts'

export interface CatalogDeps<T> {
  uow: UnitOfWork<T>
  products: ProductRepository<T>
  media: MediaDirectory<T>
  audit: AuditLog<T>
  clock: Clock
}
