import type { AuditLog, Clock, MediaLookup, TourRepository, UnitOfWork } from '../ports.ts'

export interface TourDeps<T> {
  uow: UnitOfWork<T>
  tours: TourRepository<T>
  media: MediaLookup<T>
  audit: AuditLog<T>
  clock: Clock
}
