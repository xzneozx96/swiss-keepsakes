import type { Context } from 'hono'
import { createHash } from 'node:crypto'

// The public reads are cached by the browser for 30 s and then revalidated with the ETag (ADR-006). No `public`:
// no shared cache is promised, and no cookie is ever set on these answers.
export const publicCacheControl = 'max-age=30'

const weakPrefix = /^W\//

function matches(header: string | undefined, tag: string): boolean {
  return (header ?? '').split(',').some((value) => {
    const candidate = value.trim().replace(weakPrefix, '')
    return candidate === '*' || candidate === tag
  })
}

// 200 with the body, the Cache-Control and a strong ETag (sha-256 of the body); 304 with no body when the
// request's If-None-Match holds that tag.
export function conditionalJson<B extends object>(c: Context, body: B) {
  const tag = `"${createHash('sha256').update(JSON.stringify(body)).digest('hex')}"`
  const headers = { 'Cache-Control': publicCacheControl, 'ETag': tag }
  if (matches(c.req.header('If-None-Match'), tag))
    return c.body(null, 304, headers)
  return c.json(body, 200, headers)
}
