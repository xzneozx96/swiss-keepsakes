import type { AuditLog, Clock, KeepsakeLinks, MediaDirectory, PickupPlaceRepository, ProductRepository, ReservationDirectory, SalesDirectory, StockLevels, StockSeeding, UnitOfWork } from '../ports.ts'

export interface CatalogDeps<T> {
  uow: UnitOfWork<T>
  products: ProductRepository<T>
  media: MediaDirectory<T>
  audit: AuditLog<T>
  clock: Clock
  keepsakeLinks: KeepsakeLinks<T>
  // The three inventory ports, wired in main.ts (ADR-013). Optional in the type so a test builds only what it needs.
  // Without `reservations` archiving never finds a reserved unit, without `stock` no stock row is made, and without
  // `stockLevels` every figure reads 0.
  reservations?: ReservationDirectory<T>
  stock?: StockSeeding<T>
  stockLevels?: StockLevels<T>
  // Left out until the orders module wires the order lines. Without it no keepsake counts as sold, so a removal deletes.
  sales?: SalesDirectory<T>
}

export interface PickupDeps<T> {
  uow: UnitOfWork<T>
  pickups: PickupPlaceRepository<T>
  audit: AuditLog<T>
  clock: Clock
}
