import type { MiddlewareHandler } from 'hono'
import type { AppEnv } from './app.ts'
import { problem } from './problem.ts'

const mutating = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

// The CSRF rule of architecture section 9. Mounted on /api/*, before anything reads the session or the body.
// A POST, PUT, PATCH or DELETE must carry our own origin in `Origin`, whatever its content type. A foreign
// origin, the literal "null" that a browser sends from an opaque context, and a missing header are all refused.
// Browsers add `Origin` to every such request, the SPA's own included. A client that is not a browser has to
// send it too. The mount path is what leaves /webhooks/stripe out: it sits outside /api/, sends no browser
// `Origin`, and Stripe's signature is its check. Better Auth checks /api/auth/* again against its trusted origins.
export function requireOwnOrigin(origin: string): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    if (mutating.has(c.req.method) && c.req.header('Origin') !== origin)
      return problem(c, { type: 'origin-refused', status: 403, title: 'The request does not come from this site' })
    await next()
  }
}
