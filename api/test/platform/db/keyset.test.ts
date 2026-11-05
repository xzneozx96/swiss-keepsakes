import { sql } from 'drizzle-orm'
import { PgDialect } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'
import { after, page } from '../../../src/platform/db/keyset.ts'

const dialect = new PgDialect()
const columns = [{ column: sql`published_at`, cast: 'timestamptz' as const }, { column: sql`id`, cast: 'uuid' as const }]

describe('[ADR-033] keyset after', () => {
  it('writes the row comparison with each value cast from text', () => {
    const query = dialect.sqlToQuery(after(columns, ['2026-11-05T10:00:00.123456Z', 'id-1']))

    expect(query.sql).toBe('(published_at, id) < ($1::timestamptz, $2::uuid)')
    expect(query.params).toEqual(['2026-11-05T10:00:00.123456Z', 'id-1'])
  })

  it('writes an ascending order the other way', () => {
    expect(dialect.sqlToQuery(after(columns.slice(1), ['id-1'], 'asc')).sql).toBe('(id) > ($1::uuid)')
  })

  it('refuses a key that does not match the columns', () => {
    expect(() => after(columns, ['only one'])).toThrow()
    expect(() => after([], [])).toThrow()
  })
})

describe('[ADR-033] keyset page', () => {
  const rows = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
  const keyOf = (row: { id: string }) => row.id

  it('drops the extra row and keys the last one kept', () => {
    expect(page(rows, 2, keyOf)).toEqual({ items: [{ id: 'a' }, { id: 'b' }], next: 'b' })
  })

  it('exactly limit rows is the last page: next is null and no empty page follows', () => {
    expect(page(rows.slice(0, 2), 2, keyOf)).toEqual({ items: [{ id: 'a' }, { id: 'b' }], next: null })
  })

  it('a short page and an empty page have no next', () => {
    expect(page(rows.slice(0, 1), 2, keyOf).next).toBeNull()
    expect(page([], 2, keyOf)).toEqual({ items: [], next: null })
  })

  it('without a limit the whole read is the page', () => {
    expect(page(rows, undefined, keyOf)).toEqual({ items: rows, next: null })
  })
})
