import type { RequestIdVariables } from 'hono/request-id'
import type { Logger } from 'pino'
import { STATUS_CODES } from 'node:http'
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { HTTPException } from 'hono/http-exception'
import { requestId } from 'hono/request-id'
import { routePath } from 'hono/route'
import { problem } from './problem.ts'

export interface AppEnv {
  Variables: RequestIdVariables & { logger: Logger }
}

const healthRoute = createRoute({
  method: 'get',
  path: '/healthz',
  responses: {
    200: {
      description: 'The process is up',
      content: { 'application/json': { schema: z.object({ status: z.literal('ok') }) } },
    },
  },
})

export function createApp(logger: Logger): OpenAPIHono<AppEnv> {
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

  app.use(requestId())
  app.use(async (c, next) => {
    const started = performance.now()
    const requestLogger = logger.child({ requestId: c.get('requestId') })
    c.set('logger', requestLogger)
    await next()
    // The pattern of the route that ran, not the URL: a path such as /partner/{token} carries a secret.
    requestLogger.info({ method: c.req.method, route: routePath(c), status: c.res.status, ms: Math.round(performance.now() - started) }, 'request')
  })

  app.openapi(healthRoute, c => c.json({ status: 'ok' as const }, 200))

  app.notFound(c => problem(c, { type: 'not-found', status: 404, title: 'Not found' }))

  app.onError((error, c) => {
    if (error instanceof HTTPException) {
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
