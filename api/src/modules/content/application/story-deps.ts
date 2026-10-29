import type { AuditLog, Clock, MediaRepository, PinRepository, StoryRepository, UnitOfWork } from '../ports.ts'

export interface StoryDeps<T> {
  uow: UnitOfWork<T>
  stories: StoryRepository<T>
  media: MediaRepository<T>
  pins: Pick<PinRepository<T>, 'idsInStore'>
  audit: AuditLog<T>
  clock: Clock
}
