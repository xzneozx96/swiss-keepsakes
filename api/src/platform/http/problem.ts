import type { Context } from 'hono'
import type { RequestIdVariables } from 'hono/request-id'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

// RFC 9457 problem details. `type` is a stable code the SPA maps to translated copy (D11).
// `about:blank` means the HTTP status says everything there is to say.
export interface Problem {
  type: string
  status: ContentfulStatusCode
  title: string
  errors?: { in: string, path: string, message: string }[]
}

export function problem<E extends { Variables: RequestIdVariables }>(c: Context<E>, details: Problem): Response {
  const body = { ...details, instance: c.req.path, requestId: c.get('requestId') }
  return c.body(JSON.stringify(body), details.status, { 'Content-Type': 'application/problem+json' })
}
