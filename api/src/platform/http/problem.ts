import type { Problem } from '@sk/api-contract'
import type { Context } from 'hono'
import type { RequestIdVariables } from 'hono/request-id'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

// RFC 9457 problem details in the contract's problemSchema shape. problem() adds `instance` and `requestId`.
type ProblemDetails<S extends ContentfulStatusCode> = Omit<Problem, 'status' | 'instance' | 'requestId'> & { status: S }

// A typed JSON response, so a zod-openapi route can return it only for a status whose problem it declares.
export function problem<E extends { Variables: RequestIdVariables }, S extends ContentfulStatusCode>(c: Context<E>, details: ProblemDetails<S>) {
  const body: Problem = { ...details, instance: c.req.path, requestId: c.get('requestId') }
  return c.json(body, details.status, { 'Content-Type': 'application/problem+json' })
}
