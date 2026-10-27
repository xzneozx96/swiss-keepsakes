import type { AuditLog, Clock, MediaRepository, PinRepository, UnitOfWork } from '../ports.ts'

export interface PinDeps<T> {
  uow: UnitOfWork<T>
  pins: PinRepository<T>
  media: MediaRepository<T>
  audit: AuditLog<T>
  clock: Clock
}
