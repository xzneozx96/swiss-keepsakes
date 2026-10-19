import type { Database, Tx } from './client.ts'
import { AsyncLocalStorage } from 'node:async_hooks'
import { withClaim } from '../idempotency.ts'

// The transaction port (architecture 4.1). A use case calls `uow.run(async (tx) => ...)` and passes `tx` to
// repositories, the audit log and the job queue, so the business write, the audit row and the jobs commit
// together. Use cases are generic over Tx and never see Drizzle.
export interface UnitOfWork<T> {
  run: <R>(work: (tx: T) => Promise<R>) => Promise<R>
}

const openUnit = new AsyncLocalStorage<true>()

export function createUnitOfWork(db: Database): UnitOfWork<Tx> {
  return {
    async run(work) {
      // A nested unit is a second transaction the outer one cannot see, and inside a command request it would
      // wait forever on the outer one's Idempotency-Key claim.
      if (openUnit.getStore())
        throw new Error('uow.run was called inside another uow.run. Pass the outer tx to that work instead.')
      // Inside a command request, the Idempotency-Key is claimed in the same transaction (see idempotency.ts).
      return withClaim(claimFirst => openUnit.run(true, () => db.transaction(async (tx) => {
        await claimFirst(tx)
        return work(tx)
      })))
    },
  }
}
