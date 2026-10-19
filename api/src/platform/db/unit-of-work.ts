import type { Database, Tx } from './client.ts'

// The transaction port (architecture 4.1). A use case calls `uow.run(async (tx) => ...)` and passes `tx` to
// repositories, the audit log and the job queue, so the business write, the audit row and the jobs commit
// together. Use cases are generic over Tx and never see Drizzle.
export interface UnitOfWork<T> {
  run: <R>(work: (tx: T) => Promise<R>) => Promise<R>
}

export function createUnitOfWork(db: Database): UnitOfWork<Tx> {
  return { run: work => db.transaction(work) }
}
