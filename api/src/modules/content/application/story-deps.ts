import type { AuditLog, Clock, MediaLookup, StoryRepository, UnitOfWork } from '../ports.ts'

export interface StoryDeps<T> {
  uow: UnitOfWork<T>
  stories: StoryRepository<T>
  media: MediaLookup<T>
  audit: AuditLog<T>
  clock: Clock
}
