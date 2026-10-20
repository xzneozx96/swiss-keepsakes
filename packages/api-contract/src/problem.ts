import { z } from 'zod'

// The codes the API sends: problem() in api/ takes no other, so a new code starts here. A client maps each one
// to translated copy (D11) and shows generic copy for any other code, so a page loaded before the API gained a
// code still reads the problem. `about:blank` means the HTTP status says everything there is to say.
export const problemTypes = [
  'about:blank',
  'not-found',
  'validation-failed',
  'internal-error',
  'unhealthy',
  'idempotency-key-required',
  'idempotency-key-reused',
  'idempotency-key-in-use',
  'body-too-large',
  'unauthenticated',
  'forbidden',
] as const

export type ProblemType = (typeof problemTypes)[number]

export const problemSchema = z.object({
  // A string on the wire, not an enum, for the reason above.
  type: z.string().meta({ description: `A stable code. Known codes: ${problemTypes.join(', ')}. Show generic copy for any other` }),
  status: z.int().min(400).max(599),
  title: z.string(),
  instance: z.string().meta({ description: 'The request path' }),
  requestId: z.string().meta({ description: 'The server\'s id for this request, also sent as X-Request-Id' }),
  errors: z.array(z.object({ in: z.string(), path: z.string(), message: z.string() })).optional(),
  checks: z.record(z.string(), z.enum(['ok', 'failed'])).optional(),
}).meta({ id: 'Problem', description: 'RFC 9457 problem details, sent as application/problem+json' })

export type Problem = z.infer<typeof problemSchema>
