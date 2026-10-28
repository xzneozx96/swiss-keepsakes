import type { OpenAPIHono } from '@hono/zod-openapi'
import type { Actor } from '@sk/domain/identity'
import type { AppEnv } from '../../../platform/http/app.ts'
import type { Result } from '../application/failure.ts'
import type { UploadGrant } from '../application/request-upload.ts'
import { createRoute } from '@hono/zod-openapi'
import { uploadGrantSchema, uploadRequestSchema } from '@sk/api-contract'
import { problem } from '../../../platform/http/problem.ts'
import { problemResponses, requestIdHeader } from '../../../platform/http/responses.ts'
import { StorageUnavailableError } from '../ports.ts'
import { failureProblem } from './problems.ts'
import { json, storeParams } from './route-parts.ts'

// What the media routes call. main.ts builds each from the module's use cases. They touch object storage, not a
// transaction, so guardUseCases does not wrap them: the route turns a StorageUnavailableError into a 503.
export interface MediaUseCases {
  requestUpload: (actor: Actor, storeId: string, input: { contentType: string, byteSize: number }) => Promise<Result<UploadGrant>>
}

const requestUploadRoute = createRoute({
  method: 'post',
  path: '/api/store/{storeId}/media/uploads',
  request: { params: storeParams, body: { required: true, content: json(uploadRequestSchema) } },
  responses: {
    200: { description: 'Where to PUT the file. The URL works once, for 15 minutes', headers: requestIdHeader, content: json(uploadGrantSchema) },
    ...problemResponses,
  },
})

const storageUnavailable = { status: 503, type: 'storage-unavailable', title: 'File storage is not available right now. Try again in a moment.' } as const

// Runs a use case; a storage that is not configured or not answering is a 503, anything else is the caller's to see.
async function withStorage<V>(work: () => Promise<Result<V>>): Promise<Result<V> | typeof storageUnavailable> {
  try {
    return await work()
  }
  catch (error) {
    if (error instanceof StorageUnavailableError)
      return storageUnavailable
    throw error
  }
}

const isUnavailable = (result: object): result is typeof storageUnavailable => 'status' in result

// The store guard sits before these (createApp), so handlers read the verified store from `c.get('store')`.
export function registerMediaRoutes(app: OpenAPIHono<AppEnv>, useCases: MediaUseCases): void {
  app.openapi(requestUploadRoute, async (c) => {
    const result = await withStorage(() => useCases.requestUpload(c.get('actor'), c.get('store').storeId, c.req.valid('json')))
    if (isUnavailable(result))
      return problem(c, result)
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(result.value, 200)
  })
}
