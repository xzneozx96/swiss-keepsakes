import type { Context, Next } from 'hono'
import type { AppEnv } from '../../../platform/http/app.ts'
import { z } from '@hono/zod-openapi'
import { requestIdHeader } from '../../../platform/http/responses.ts'

export const json = <S extends z.ZodType>(schema: S) => ({ 'application/json': { schema } })

const ifMatchHeader = z.string().optional().meta({ description: 'The row version you opened, as `3`, `"3"` or `W/"3"`' })
export const withIfMatch = { headers: z.object({ 'If-Match': ifMatchHeader }) }

export const storeParams = z.object({ storeId: z.uuid() })
export const etagHeaders = { ...requestIdHeader, ETag: { description: 'The row version, as `"<rowVersion>"`', schema: { type: 'string' } } } as const

export const etag = (row: { rowVersion: number }) => ({ ETag: `"${row.rowVersion}"` })

// The publish body is optional. A client that sets the JSON Content-Type and sends nothing is sent on as one that set
// no Content-Type, which the validator lets through, instead of a 400 for an empty JSON document (as the identity
// module's acceptEmptyBody does). The pin and tour publish routes use it.
export async function acceptEmptyBody(c: Context<AppEnv>, next: Next) {
  if (c.req.header('Content-Type') !== undefined && (await c.req.arrayBuffer()).byteLength === 0) {
    const headers = new Headers(c.req.raw.headers)
    headers.delete('Content-Type')
    // The body is read already, and a Request cannot be built from one that was, so build it from the parts.
    c.req.raw = new Request(c.req.url, { method: c.req.method, headers })
  }
  await next()
}
