import { z } from 'zod'

// Every `type` the API sends. The SPA maps each one to translated copy (D11), so a new code starts here.
// `about:blank` means the HTTP status says everything there is to say.
const problemTypes = [
  'about:blank',
  'not-found',
  'validation-failed',
  'internal-error',
  'unhealthy',
  'idempotency-key-required',
  'idempotency-key-reused',
  'idempotency-key-in-use',
  'body-too-large',
] as const

export const problemSchema = z.object({
  type: z.enum(problemTypes),
  status: z.int().min(400).max(599),
  title: z.string(),
  instance: z.string().meta({ description: 'The request path' }),
  requestId: z.string().meta({ description: 'The server\'s id for this request, also sent as X-Request-Id' }),
  errors: z.array(z.object({ in: z.string(), path: z.string(), message: z.string() })).optional(),
  checks: z.record(z.string(), z.enum(['ok', 'failed'])).optional(),
}).meta({ id: 'Problem', description: 'RFC 9457 problem details, sent as application/problem+json' })

export type Problem = z.infer<typeof problemSchema>
