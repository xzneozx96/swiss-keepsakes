import type { AuditLog, Clock, MediaRepository, TourRepository, UnitOfWork } from '../ports.ts'

export interface TourDeps<T> {
  uow: UnitOfWork<T>
  tours: TourRepository<T>
  media: MediaRepository<T>
  audit: AuditLog<T>
  clock: Clock
}
