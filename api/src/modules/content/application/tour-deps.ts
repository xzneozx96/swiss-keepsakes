import type { AuditLog, Clock, JobQueue, MediaLookup, TourRepository, UnitOfWork } from '../ports.ts'

export interface TourDeps<T> {
  uow: UnitOfWork<T>
  tours: TourRepository<T>
  media: MediaLookup<T>
  audit: AuditLog<T>
  clock: Clock
  jobs: JobQueue<T>
  // How long a replaced PDF stays on storage before its retire job runs.
  graceHours: number
}
