import type { OpenAPIHono } from '@hono/zod-openapi'
import type { Actor } from '@sk/domain/identity'
import type { Context } from 'hono'
import type { AppEnv } from '../../../platform/http/app.ts'
import type { Result } from '../application/failure.ts'
import type { UploadGrant } from '../application/request-upload.ts'
import type { MediaRecord } from '../ports.ts'
import { createRoute, z } from '@hono/zod-openapi'
import { confirmUploadSchema, mediaSchema, uploadGrantSchema, uploadRequestSchema } from '@sk/api-contract'
import { problem } from '../../../platform/http/problem.ts'
import { problemResponses, requestIdHeader } from '../../../platform/http/responses.ts'
import { StorageUnavailableError } from '../ports.ts'
import { mediaView } from './media-view.ts'
import { failureProblem } from './problems.ts'
import { json, storeParams } from './route-parts.ts'

// What the media routes call. main.ts builds each from the module's use cases. They touch object storage, not a
// transaction, so guardUseCases does not wrap them: the route turns a StorageUnavailableError into a 503.
export interface MediaUseCases {
  requestUpload: (actor: Actor, storeId: string, input: { contentType: string, byteSize: number }) => Promise<Result<UploadGrant>>
  confirmUpload: (actor: Actor, storeId: string, input: { uploadKey: string }, requestId: string | null) => Promise<Result<MediaRecord>>
  getMedia: (actor: Actor, storeId: string, mediaId: string) => Promise<Result<MediaRecord>>
  // The public URL of a key in the `media` bucket. Throws StorageUnavailableError when storage is not configured.
  publicUrl: (key: string) => string
}

const requestUploadRoute = createRoute({
  method: 'post',
  path: '/api/store/{storeId}/media/uploads',
  request: { params: storeParams, body: { required: true, content: json(uploadRequestSchema) } },
  responses: {
    200: { description: 'Where to PUT the file. The URL is valid for 15 minutes', headers: requestIdHeader, content: json(uploadGrantSchema) },
    ...problemResponses,
  },
})

const confirmUploadRoute = createRoute({
  method: 'post',
  path: '/api/store/{storeId}/media/confirm',
  request: { params: storeParams, body: { required: true, content: json(confirmUploadSchema) } },
  responses: {
    201: { description: 'The file was checked and is being processed. Read it until its status is ready', headers: requestIdHeader, content: json(mediaSchema) },
    ...problemResponses,
  },
})

const getMediaRoute = createRoute({
  method: 'get',
  path: '/api/store/{storeId}/media/{mediaId}',
  request: { params: z.object({ storeId: z.uuid(), mediaId: z.uuid() }) },
  responses: {
    200: { description: 'The file. The URLs are set when its status is ready', headers: requestIdHeader, content: json(mediaSchema) },
    ...problemResponses,
  },
})

const storageUnavailable = { status: 503, type: 'storage-unavailable', title: 'File storage is not available right now. Try again in a moment.' } as const

// Runs a whole handler body: a storage that is not configured or not answering, whether a use case or the view
// raises it, is a 503. Anything else is the caller's to see.
async function withStorage<R>(c: Context<AppEnv>, handler: () => Promise<R>): Promise<R | ReturnType<typeof problem>> {
  try {
    return await handler()
  }
  catch (error) {
    if (error instanceof StorageUnavailableError)
      return problem(c, storageUnavailable)
    throw error
  }
}

// The store guard sits before these (createApp), so handlers read the verified store from `c.get('store')`.
export function registerMediaRoutes(app: OpenAPIHono<AppEnv>, useCases: MediaUseCases): void {
  app.openapi(requestUploadRoute, c => withStorage(c, async () => {
    const result = await useCases.requestUpload(c.get('actor'), c.get('store').storeId, c.req.valid('json'))
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(result.value, 200)
  }))
  app.openapi(confirmUploadRoute, c => withStorage(c, async () => {
    const result = await useCases.confirmUpload(c.get('actor'), c.get('store').storeId, c.req.valid('json'), c.get('requestId'))
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(mediaView(result.value, useCases.publicUrl), 201)
  }))
  // The view asks for a URL only when the row is ready, so a storage that is not configured fails there, not before.
  app.openapi(getMediaRoute, c => withStorage(c, async () => {
    const result = await useCases.getMedia(c.get('actor'), c.get('store').storeId, c.req.valid('param').mediaId)
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(mediaView(result.value, useCases.publicUrl), 200)
  }))
}
