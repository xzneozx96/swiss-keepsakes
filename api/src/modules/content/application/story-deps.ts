import type { AuditLog, Clock, MediaRepository, StoryRepository, UnitOfWork } from '../ports.ts'

export interface StoryDeps<T> {
  uow: UnitOfWork<T>
  stories: StoryRepository<T>
  media: MediaRepository<T>
  audit: AuditLog<T>
  clock: Clock
}
