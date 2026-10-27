import type { Failure } from '../application/failure.ts'

const slugConstraints = new Set([
  'places_slug_en_key',
  'places_slug_de_key',
  'tours_slug_en_key',
  'tours_slug_de_key',
  'story_versions_language_slug_key',
])

const publishedFieldsChecks = new Set([
  'places_published_fields_check',
  'tours_published_fields_check',
  'story_versions_published_fields_check',
])

const sqlstate = /^[0-9A-Z]{5}$/

interface PgError { code: string, constraint?: string, message?: string }

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

// The database guards (migrations 0008 and 0009) stay the backstop; the use cases check the same rules first.
export function mapDatabaseError(error: unknown): Failure | undefined {
  const pg = findPgError(error)
  if (!pg)
    return undefined
  const message = pg.message ?? ''
  const constraint = pg.constraint ?? ''
  if (pg.code === '23505' && slugConstraints.has(constraint))
    return { reason: 'slug-taken' }
  if (pg.code === '23001') {
    return message.includes('cannot be deleted') ? { reason: 'published-cannot-be-deleted' } : { reason: 'in-use' }
  }
  if (pg.code === '23503') {
    // Postgres words a delete that a reference blocks as "update or delete on table", an insert or update as "insert or update on table".
    return message.startsWith('update or delete on table') ? { reason: 'in-use' } : { reason: 'reference-invalid' }
  }
  if (pg.code === '23514' && publishedFieldsChecks.has(constraint))
    return { reason: 'incomplete', gaps: [] }
  return undefined
}
