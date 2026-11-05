import type { SQL } from 'drizzle-orm'
import { sql } from 'drizzle-orm'

// The keyset ("seek") half of ADR-033: a row comparison after the last row seen, and the `limit + 1` read.

// The cast of each key value, which arrives as text. A timestamp is cast from text, so no microsecond is lost.
const CASTS = { timestamptz: 'timestamptz', uuid: 'uuid', text: 'text', bigint: 'bigint', integer: 'integer', float8: 'float8' } as const

export interface KeyColumn {
  /** The column or expression, in `order by` order. Every sort key is NOT NULL, or wrapped in `coalesce` the same way in the `order by`. */
  column: SQL
  cast: keyof typeof CASTS
}

/**
 * `(k1, k2, id) < ($k1, $k2, $id)` for a descending order, or `>` for an ascending one. Every column goes the same way, and
 * the last is the row's unique id (a single row comparison cannot mix directions). `key` is the last row's key, as text.
 */
export function after(columns: readonly KeyColumn[], key: readonly string[], direction: 'desc' | 'asc' = 'desc'): SQL {
  if (columns.length === 0 || columns.length !== key.length)
    throw new Error('The key must hold one value for each column')
  const left = sql.join(columns.map(({ column }) => column), sql`, `)
  const right = sql.join(columns.map(({ cast }, index) => sql`${key[index]}::${sql.raw(CASTS[cast])}`), sql`, `)
  return sql`(${left}) ${sql.raw(direction === 'desc' ? '<' : '>')} (${right})`
}

/**
 * Trims the `limit + 1` read: the extra row only says there is a next page. `next` is the key of the last row kept, and null on
 * the last page, and only there (a short page never means the end). Without a `limit` the whole read is the page.
 */
export function page<R, K>(rows: readonly R[], limit: number | undefined, keyOf: (row: R) => K): { items: R[], next: K | null } {
  if (limit === undefined || rows.length <= limit)
    return { items: [...rows], next: null }
  const items = rows.slice(0, limit)
  return { items, next: keyOf(items.at(-1) as R) }
}
