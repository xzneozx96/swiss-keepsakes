import type { AuditLog, Clock, MediaLookup, PinRepository, StoryRepository, UnitOfWork } from '../ports.ts'

export interface StoryDeps<T> {
  uow: UnitOfWork<T>
  stories: StoryRepository<T>
  media: MediaLookup<T>
  pins: Pick<PinRepository<T>, 'idsInStore'>
  audit: AuditLog<T>
  clock: Clock
}
