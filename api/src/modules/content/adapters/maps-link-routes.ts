import type { OpenAPIHono } from '@hono/zod-openapi'
import type { Actor } from '@sk/domain/identity'
import type { AppEnv } from '../../../platform/http/app.ts'
import type { Result } from '../application/failure.ts'
import type { MapsPosition } from '../application/maps-link.ts'
import { createRoute } from '@hono/zod-openapi'
import { mapsLinkPositionSchema, mapsLinkQuerySchema } from '@sk/api-contract'
import { problem } from '../../../platform/http/problem.ts'
import { problemResponses, requestIdHeader } from '../../../platform/http/responses.ts'
import { failureProblem } from './problems.ts'
import { json, storeParams } from './route-parts.ts'

export interface MapsLinkUseCases {
  resolveMapsLink: (actor: Actor, storeId: string, url: string) => Promise<Result<MapsPosition>>
}

const resolveMapsLinkRoute = createRoute({
  method: 'get',
  path: '/api/store/{storeId}/maps-link',
  request: { params: storeParams, query: mapsLinkQuerySchema },
  responses: {
    200: { description: 'The position the Google Maps short link points to. The server follows at most 5 redirects, only through Google hosts. 422 `maps-link-unreadable` when the link is not a short link, leaves Google, takes too long or holds no position', headers: requestIdHeader, content: json(mapsLinkPositionSchema) },
    ...problemResponses,
  },
})

export function registerMapsLinkRoutes(app: OpenAPIHono<AppEnv>, useCases: MapsLinkUseCases): void {
  app.openapi(resolveMapsLinkRoute, async (c) => {
    const result = await useCases.resolveMapsLink(c.get('actor'), c.get('store').storeId, c.req.valid('query').url)
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(result.value, 200)
  })
}
