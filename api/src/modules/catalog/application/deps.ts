import type { AuditLog, Clock, MediaDirectory, ProductRepository, ReservationDirectory, SalesDirectory, UnitOfWork } from '../ports.ts'

export interface CatalogDeps<T> {
  uow: UnitOfWork<T>
  products: ProductRepository<T>
  media: MediaDirectory<T>
  audit: AuditLog<T>
  clock: Clock
  // Left out until E6.3 wires the inventory module's reserved units. Without it archiving never finds one.
  reservations?: ReservationDirectory<T>
  // Left out until the orders module wires the order lines. Without it no keepsake counts as sold, so a removal deletes.
  sales?: SalesDirectory<T>
}
