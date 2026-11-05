import type { Context } from 'hono'
import type { RequestIdVariables } from 'hono/request-id'
import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { z } from 'zod'
import { problem } from './problem.ts'

// The opaque cursor of ADR-033 section 3: URL-safe base64 of `{"v":1,"k":[...],"f":"<hash>"}`. `k` holds the last row's sort
// values as text (a timestamp as text, never a Date, which would cut microseconds) with the id last. `f` ties the cursor to
// the route, filters, sort and language it came from. It is not signed: a forged cursor only starts the same query at
// another position, and the route guard and the `where` clause still decide what the caller sees.

const VERSION = 1

const body = z.object({ v: z.literal(VERSION), k: z.array(z.string()), f: z.string() })

/** What a cursor belongs to: the route and every filter, sort and language that changes the rows. Never the `limit`. */
export type CursorScope = Record<string, string | number | boolean | null | undefined>

// A short hash of the scope, with the names sorted so the order of the keys does not matter.
function scopeHash(scope: CursorScope): string {
  const entries = Object.entries(scope).filter(([, value]) => value !== undefined).sort(([a], [b]) => (a < b ? -1 : 1))
  return createHash('sha256').update(JSON.stringify(entries)).digest('base64url').slice(0, 12)
}

export function encodeCursor(key: readonly string[], scope: CursorScope): string {
  return Buffer.from(JSON.stringify({ v: VERSION, k: key, f: scopeHash(scope) })).toString('base64url')
}

export type DecodedCursor<K> = { ok: true, key: K } | { ok: false }

/**
 * The key of a cursor, or `{ ok: false }` when it does not decode, has another version, has values `keySchema` refuses, or
 * was made for another scope. The route answers that with `cursorProblem`.
 */
export function decodeCursor<K extends readonly string[]>(raw: string, scope: CursorScope, keySchema: z.ZodType<K>): DecodedCursor<K> {
  let parsed: unknown
  try {
    parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'))
  }
  catch {
    return { ok: false }
  }
  const cursor = body.safeParse(parsed)
  if (!cursor.success || cursor.data.f !== scopeHash(scope))
    return { ok: false }
  const key = keySchema.safeParse(cursor.data.k)
  return key.success ? { ok: true, key: key.data } : { ok: false }
}

/** The 400 `validation-failed` of a bad or mismatched cursor, on the `cursor` query parameter. */
export function cursorProblem<E extends { Variables: RequestIdVariables }>(c: Context<E>) {
  return problem(c, {
    type: 'validation-failed',
    status: 400,
    title: 'The request is not valid',
    errors: [{ in: 'query', path: 'cursor', message: 'This cursor is not valid for this request. Start again without it' }],
  })
}
