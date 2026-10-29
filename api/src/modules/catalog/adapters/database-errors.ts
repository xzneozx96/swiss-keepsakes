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

// The database guards (migration 0010) stay the backstop; the use cases check the same rules first.
export function mapDatabaseError(error: unknown): Failure | undefined {
  const pg = findPgError(error)
  if (!pg)
    return undefined
  if (pg.code === '23505' && pg.constraint === 'skus_store_sku_code_key')
    return { reason: 'sku-code-taken' }
  // Two keepsakes published in the same instant can both read a slug as free; the second write lands here and a new try finds it taken.
  if (pg.code === '23505' && (pg.constraint === 'products_slug_en_key' || pg.constraint === 'products_slug_de_key'))
    return { reason: 'slug-conflict' }
  if (pg.code === '23514' && pg.constraint === 'skus_sku_code_check')
    return { reason: 'sku-code-invalid', path: 'skuCode' }
  return undefined
}

// Call it from outside the unit of work: the deferrable constraints report only at COMMIT, which `uow.run` throws, and
// a caught pg error inside the transaction leaves it aborted (25P02). The thrown error rolled the transaction back,
// claim included, so a retry with the same Idempotency-Key runs again.
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

// Wraps every use case so each call runs through `mappingDatabaseErrors`, from outside its unit of work.
export function guardUseCases<U extends Record<string, (...args: never[]) => Promise<Result<unknown>>>>(useCases: U): U {
  return Object.fromEntries(
    Object.entries(useCases).map(([name, useCase]) => [name, (...args: never[]) => mappingDatabaseErrors(() => useCase(...args))]),
  ) as U
}
