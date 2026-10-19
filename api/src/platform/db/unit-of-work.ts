import type { Database, Tx } from './client.ts'
import { claimInTransaction } from '../idempotency.ts'

// The transaction port (architecture 4.1). A use case calls `uow.run(async (tx) => ...)` and passes `tx` to
// repositories, the audit log and the job queue, so the business write, the audit row and the jobs commit
// together. Use cases are generic over Tx and never see Drizzle.
export interface UnitOfWork<T> {
  run: <R>(work: (tx: T) => Promise<R>) => Promise<R>
}

export function createUnitOfWork(db: Database): UnitOfWork<Tx> {
  return {
    async run(work) {
      // Inside a command request, the Idempotency-Key is claimed in the same transaction (see idempotency.ts).
      const [result, claim] = await db.transaction(async (tx) => {
        const claim = await claimInTransaction(tx)
        return [await work(tx), claim] as const
      })
      // Only after the commit: a key whose transaction rolled back was never claimed.
      if (claim)
        claim.committed = true
      return result
    },
  }
}
