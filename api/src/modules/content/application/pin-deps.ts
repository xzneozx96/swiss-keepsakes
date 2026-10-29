import type { AuditLog, Clock, MediaLookup, PinRepository, UnitOfWork } from '../ports.ts'

export interface PinDeps<T> {
  uow: UnitOfWork<T>
  pins: PinRepository<T>
  media: MediaLookup<T>
  audit: AuditLog<T>
  clock: Clock
}
