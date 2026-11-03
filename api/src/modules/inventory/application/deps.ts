import type { AuditLog, Clock, MediaDirectory, SkuDirectory, StockRepository, UnitOfWork } from '../ports.ts'

export interface InventoryDeps<T> {
  uow: UnitOfWork<T>
  stock: StockRepository<T>
  skus: SkuDirectory<T>
  media: MediaDirectory<T>
  audit: AuditLog<T>
  clock: Clock
}
