import type { PublishGap } from '@sk/domain/content'
import { mapDatabaseError } from '../adapters/database-errors.ts'

export type Failure
  = | { reason: 'forbidden' | 'not-found' | 'stale' | 'slug-taken' | 'media-retired' | 'media-invalid' | 'reference-invalid' | 'published-cannot-be-deleted' | 'published-cannot-move' | 'version-exists' | 'not-published' | 'in-use' }
    | { reason: 'incomplete', gaps: PublishGap[] }

export type Result<V> = { ok: true, value: V } | ({ ok: false } & Failure)

export function fail(failure: Failure): { ok: false } & Failure {
  return { ok: false, ...failure }
}

export function ok<V>(value: V): Result<V> {
  return { ok: true, value }
}

// Call it from outside the unit of work, as `mappingDatabaseErrors(() => uow.run(...))`, never around one
// statement inside it: a caught pg error leaves the transaction aborted (25P02), and the deferrable constraints
// report only at COMMIT, which `uow.run` throws. The thrown error rolled the transaction back, claim included,
// so a retry with the same Idempotency-Key runs again.
export async function mappingDatabaseErrors<V>(work: () => Promise<Result<V>>): Promise<Result<V>> {
  try {
    return await work()
  }
  catch (error) {
    const failure = mapDatabaseError(error)
    if (!failure)
      throw error
    return fail(failure)
  }
}
