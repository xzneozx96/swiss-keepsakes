import { describe, expect, it } from 'vitest'
import { mapDatabaseError } from '../../../src/modules/content/adapters/database-errors.ts'
import { fail, mappingDatabaseErrors, ok } from '../../../src/modules/content/application/failure.ts'

function pg(code: string, constraint?: string, message = '') {
  return { cause: { code, constraint, message } }
}

describe('mapDatabaseError', () => {
  it.each([
    'places_slug_en_key',
    'places_slug_de_key',
    'tours_slug_en_key',
    'tours_slug_de_key',
    'story_versions_language_slug_key',
  ])('[E2.6] a unique violation on %s is slug-taken', (constraint) => {
    expect(mapDatabaseError(pg('23505', constraint))).toEqual({ reason: 'slug-taken' })
  })

  it('[E2.6] a unique violation on another constraint is unknown', () => {
    expect(mapDatabaseError(pg('23505', 'something_else_key'))).toBeUndefined()
  })

  it('[E2.6] the published delete guard is published-cannot-be-deleted', () => {
    expect(mapDatabaseError(pg('23001', undefined, 'a published place cannot be deleted'))).toEqual({ reason: 'published-cannot-be-deleted' })
  })

  it('[E2.6] another restrict violation is in-use', () => {
    expect(mapDatabaseError(pg('23001', 'x_fkey', 'update or delete on table "media" violates RESTRICT'))).toEqual({ reason: 'in-use' })
  })

  it('[E2.6] a foreign key violation raised by a delete is in-use', () => {
    const message = 'update or delete on table "places" violates foreign key constraint "x_fkey" on table "story_groups"'
    expect(mapDatabaseError(pg('23503', 'x_fkey', message))).toEqual({ reason: 'in-use' })
  })

  it('[E2.6] a foreign key violation raised by an insert or update is reference-invalid', () => {
    const message = 'insert or update on table "places" violates foreign key constraint "places_cover_media_fkey"'
    expect(mapDatabaseError(pg('23503', 'places_cover_media_fkey', message))).toEqual({ reason: 'reference-invalid' })
  })

  it.each([
    'places_published_fields_check',
    'tours_published_fields_check',
    'story_versions_published_fields_check',
  ])('[E2.6] a check violation on %s is incomplete with no named gap', (constraint) => {
    expect(mapDatabaseError(pg('23514', constraint))).toEqual({ reason: 'incomplete', gaps: [] })
  })

  it('[E2.6] the pg error is found through a wrapped cause chain', () => {
    const wrapped = { cause: { cause: { code: '23505', constraint: 'tours_slug_en_key', message: '' } } }
    expect(mapDatabaseError(wrapped)).toEqual({ reason: 'slug-taken' })
  })

  it('[E2.6] an unknown pg error maps to undefined', () => {
    expect(mapDatabaseError(pg('40001', undefined, 'could not serialize'))).toBeUndefined()
    expect(mapDatabaseError(pg('23514', 'other_check'))).toBeUndefined()
    expect(mapDatabaseError(new Error('boom'))).toBeUndefined()
    expect(mapDatabaseError(undefined)).toBeUndefined()
  })
})

describe('mappingDatabaseErrors', () => {
  it('[E2.6] a result passes through untouched', async () => {
    expect(await mappingDatabaseErrors(async () => ok(7))).toEqual({ ok: true, value: 7 })
    expect(await mappingDatabaseErrors(async () => fail({ reason: 'stale' }))).toEqual({ ok: false, reason: 'stale' })
  })

  it('[E2.6] a known database error becomes a failure', async () => {
    const result = await mappingDatabaseErrors(async () => {
      throw pg('23505', 'places_slug_en_key')
    })
    expect(result).toEqual({ ok: false, reason: 'slug-taken' })
  })

  it('[E2.6] mappingDatabaseErrors rethrows an error it does not know', async () => {
    const boom = new Error('connection reset')
    await expect(mappingDatabaseErrors(async () => {
      throw boom
    })).rejects.toBe(boom)
  })
})
