import type { Problem, ProblemType } from '@sk/api-contract'
import type { Context } from 'hono'
import type { RequestIdVariables } from 'hono/request-id'
import type { ClientErrorStatusCode, ContentfulStatusCode, ServerErrorStatusCode } from 'hono/utils/http-status'

type ErrorStatusCode = ClientErrorStatusCode | ServerErrorStatusCode

// The contract's problemSchema shape, with a code from problemTypes and a 4xx or 5xx status. problem() adds
// `instance` and `requestId`.
type ProblemDetails<S extends ErrorStatusCode> = Omit<Problem, 'type' | 'status' | 'instance' | 'requestId'> & { type: ProblemType, status: S }

export function isErrorStatus(status: ContentfulStatusCode): status is ErrorStatusCode {
  return status >= 400
}

// A typed JSON response, so a zod-openapi route can return it only for a status whose problem it declares.
export function problem<E extends { Variables: RequestIdVariables }, S extends ErrorStatusCode>(c: Context<E>, details: ProblemDetails<S>) {
  const body: Problem = { ...details, instance: c.req.path, requestId: c.get('requestId') }
  return c.json(body, details.status, { 'Content-Type': 'application/problem+json' })
}
