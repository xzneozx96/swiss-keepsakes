import type { Failure, Result } from '../application/failure.ts'
import { fail } from '../application/failure.ts'

const sqlstate = /^[0-9A-Z]{5}$/

interface PgError { code: string, constraint?: string }

// Drizzle wraps the driver's error in a DrizzleQueryError and keeps it in `cause`.
function findPgError(error: unknown): PgError | undefined {
  let current = error
  for (let depth = 0; depth < 5 && typeof current === 'object' && current !== null; depth++) {
    const { code } = current as { code?: unknown }
    if (typeof code === 'string' && sqlstate.test(code))
      return current as PgError
    current = (current as { cause?: unknown }).cause
  }
  return undefined
}

// The use case checks the reserved units under the row lock; the CHECK of migration 0021 is the backstop. The database
// does not say how many units are reserved, so this failure carries no count.
export function mapDatabaseError(error: unknown): Failure | undefined {
  const pg = findPgError(error)
  if (pg?.code === '23514' && pg.constraint === 'stock_items_held_within_on_hand')
    return { reason: 'stock-below-reserved' }
  return undefined
}

// Call it from outside the unit of work: a caught pg error inside the transaction leaves it aborted (25P02), and the
// thrown error rolled it back.
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

export function guardUseCases<U extends Record<string, (...args: never[]) => Promise<Result<unknown>>>>(useCases: U): U {
  return Object.fromEntries(
    Object.entries(useCases).map(([name, useCase]) => [name, (...args: never[]) => mappingDatabaseErrors(() => useCase(...args))]),
  ) as U
}
