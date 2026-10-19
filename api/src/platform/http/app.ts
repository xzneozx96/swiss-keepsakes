import type { RequestIdVariables } from 'hono/request-id'
import type { Logger } from 'pino'
import type { HealthCheck } from '../health.ts'
import { STATUS_CODES } from 'node:http'
import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { healthSchema } from '@sk/api-contract'
import { bodyLimit } from 'hono/body-limit'
import { HTTPException } from 'hono/http-exception'
import { routePath } from 'hono/route'
import { IdempotencyKeyTaken } from '../idempotency.ts'
import { idempotencyKeyInUse } from './idempotency.ts'
import { isErrorStatus, problem } from './problem.ts'
import { problemResponses, requestIdHeader } from './responses.ts'

export interface AppEnv {
  Variables: RequestIdVariables & { logger: Logger }
}

const clientRequestIdPattern = /^[\w=-]{1,255}$/
// API requests carry JSON. Files go straight to storage through signed URLs (D14), so 1 MiB is plenty, and
// the Idempotency-Key middleware reads the whole body into memory to hash it.
const apiBodyLimit = 1024 * 1024

const healthRoute = createRoute({
  method: 'get',
  path: '/healthz',
  responses: {
    200: {
      description: 'The database and this process\'s pg-boss answer',
      headers: requestIdHeader,
      content: { 'application/json': { schema: healthSchema } },
    },
    503: { ...problemResponses.default, description: 'A check failed. The problem+json body lists each check' },
    ...problemResponses,
  },
})

export function createApp(logger: Logger, checkHealth: HealthCheck): OpenAPIHono<AppEnv> {
  const app = new OpenAPIHono<AppEnv>({
    defaultHook: (result, c) => {
      if (!result.success) {
        return problem(c, {
          type: 'validation-failed',
          status: 400,
          title: 'The request is not valid',
          errors: result.error.issues.map(issue => ({ in: result.target, path: issue.path.join('.'), message: issue.message })),
        })
      }
    },
  })
  app.openAPIRegistry.registerComponent('headers', 'RequestId', {
    description: 'The server\'s id for this request. A problem body carries it as requestId',
    schema: { type: 'string', format: 'uuid' },
  })

  app.use(async (c, next) => {
    const started = performance.now()
    // The server makes every request id, because it goes into audit_log. A client's own id is only
    // logged beside it, and only when it is safe to log.
    const requestId = crypto.randomUUID()
    const clientRequestId = c.req.header('X-Request-Id')
    c.set('requestId', requestId)
    c.header('X-Request-Id', requestId)
    const requestLogger = logger.child({
      requestId,
      clientRequestId: clientRequestId && clientRequestIdPattern.test(clientRequestId) ? clientRequestId : undefined,
    })
    c.set('logger', requestLogger)
    await next()
    // The pattern of the route that ran, not the URL: a path such as /partner/{token} carries a secret.
    requestLogger.info({ method: c.req.method, route: routePath(c), status: c.res.status, ms: Math.round(performance.now() - started) }, 'request')
  })
  // Before anything under /api/* reads the body, such as the Idempotency-Key middleware mounted after this.
  app.use('/api/*', bodyLimit({
    maxSize: apiBodyLimit,
    onError: c => problem(c, { type: 'body-too-large', status: 413, title: `The request body is over ${apiBodyLimit} bytes` }),
  }))

  app.openapi(healthRoute, async (c) => {
    const report = await checkHealth()
    if (report.database && report.jobs)
      return c.json({ status: 'ok' as const }, 200)
    const checks = Object.fromEntries(Object.entries(report).map(([name, ok]) => [name, ok ? 'ok' as const : 'failed' as const]))
    return problem(c, { type: 'unhealthy', status: 503, title: 'A dependency is not available', checks })
  })

  app.notFound(c => problem(c, { type: 'not-found', status: 404, title: 'Not found' }))

  app.onError((error, c) => {
    // A race on one Idempotency-Key, not a fault. The idempotency middleware replaces this answer.
    if (error instanceof IdempotencyKeyTaken)
      return idempotencyKeyInUse(c)
    // An HTTPException under 400 is a bug, not a problem, so it falls through to the 500 below.
    if (error instanceof HTTPException && isErrorStatus(error.status)) {
      if (error.status >= 500)
        c.get('logger').error({ err: error }, 'http exception')
      const response = problem(c, { type: 'about:blank', status: error.status, title: STATUS_CODES[error.status] ?? 'Error' })
      // Keep the headers the exception carries, such as Retry-After or WWW-Authenticate.
      error.res?.headers.forEach((value, name) => {
        if (name !== 'content-type' && name !== 'content-length')
          response.headers.set(name, value)
      })
      return response
    }
    c.get('logger').error({ err: error }, 'unhandled error')
    return problem(c, { type: 'internal-error', status: 500, title: 'Internal server error' })
  })

  return app
}
