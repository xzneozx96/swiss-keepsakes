import type { AuditLog, Clock, MediaDirectory, ProductRepository, ReservationDirectory, UnitOfWork } from '../ports.ts'

export interface CatalogDeps<T> {
  uow: UnitOfWork<T>
  products: ProductRepository<T>
  media: MediaDirectory<T>
  audit: AuditLog<T>
  clock: Clock
  // Left out until E6.3 wires the inventory module's reserved units. Without it archiving never finds one.
  reservations?: ReservationDirectory<T>
}
