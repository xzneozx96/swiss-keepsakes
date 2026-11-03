import type { OpenAPIHono } from '@hono/zod-openapi'
import type { Address } from '@sk/api-contract'
import type { Actor } from '@sk/domain/identity'
import type { AppEnv } from '../../../platform/http/app.ts'
import type { Result } from '../application/failure.ts'
import { createRoute } from '@hono/zod-openapi'
import { addressAtQuerySchema, addressSchema } from '@sk/api-contract'
import { problem } from '../../../platform/http/problem.ts'
import { problemResponses, requestIdHeader } from '../../../platform/http/responses.ts'
import { failureProblem } from './problems.ts'
import { json, storeParams } from './route-parts.ts'

export interface AddressUseCases {
  findAddressAt: (actor: Actor, storeId: string, position: { latitude: number, longitude: number }) => Promise<Result<Address>>
}

const findAddressAtRoute = createRoute({
  method: 'get',
  path: '/api/store/{storeId}/address-at',
  request: { params: storeParams, query: addressAtQuerySchema },
  responses: {
    200: { description: 'The address of the nearest building of the Swiss federal building register within 50 m of the position. 404 `address-not-found` when none stands that near, 503 `address-lookup-unavailable` when the register does not answer in 3 s', headers: requestIdHeader, content: json(addressSchema) },
    ...problemResponses,
  },
})

export function registerAddressRoutes(app: OpenAPIHono<AppEnv>, useCases: AddressUseCases): void {
  app.openapi(findAddressAtRoute, async (c) => {
    const { lat, lng } = c.req.valid('query')
    const result = await useCases.findAddressAt(c.get('actor'), c.get('store').storeId, { latitude: lat, longitude: lng })
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(result.value, 200)
  })
}
