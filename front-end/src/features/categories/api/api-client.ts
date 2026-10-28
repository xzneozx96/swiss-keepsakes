import type { CategoriesClient } from './client'

import { ApiProblem } from '@/features/data-client/errors'

/** No call waits longer than this. An abort ends the call like a lost connection does. */
const TIMEOUT_MS = 15_000

// The contract package carries Zod, so it loads on the first call and never with the first paint.
let loaded: Promise<ReturnType<(typeof import('@sk/api-contract'))['createApiClient']>> | undefined

function loadClient() {
  loaded ??= import('@sk/api-contract').then(
    module => module.createApiClient(window.location.origin),
    (error: unknown) => {
      loaded = undefined
      throw error
    },
  )

  return loaded
}

function problemOf(response: Response, body: unknown): ApiProblem {
  const { type, title, requestId } = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>

  return new ApiProblem(
    response.status,
    typeof type === 'string' ? type : 'about:blank',
    typeof title === 'string' ? title : response.statusText,
    typeof requestId === 'string' ? requestId : undefined,
  )
}

async function answer<T>(call: Promise<{ data?: T, error?: unknown, response: Response }>): Promise<T> {
  const { data, error, response } = await call

  if (data === undefined)
    throw problemOf(response, error)

  return data
}

function timeout() {
  return { signal: AbortSignal.timeout(TIMEOUT_MS) }
}

// The key belongs to the user's intent (`useIdempotencyKey`), so a retry after a timeout repeats the same request, and the API replays its answer.
function keyed(idempotencyKey: string) {
  return { ...timeout(), headers: { 'Idempotency-Key': idempotencyKey } }
}

export function createCategoriesClient(): CategoriesClient {
  return {
    list: async ({ storeId, kind }) =>
      answer((await loadClient()).GET('/api/store/{storeId}/categories/{kind}', { ...timeout(), params: { path: { storeId, kind } } })),
    create: async ({ storeId, kind, idempotencyKey, ...body }) =>
      answer((await loadClient()).POST('/api/store/{storeId}/categories/{kind}', { ...keyed(idempotencyKey), params: { path: { storeId, kind } }, body })),
    save: async ({ storeId, kind, id, idempotencyKey, ...body }) =>
      answer((await loadClient()).PATCH('/api/store/{storeId}/categories/{kind}/{categoryId}', { ...keyed(idempotencyKey), params: { path: { storeId, kind, categoryId: id } }, body })),
    reorder: async ({ storeId, kind, idempotencyKey, ...body }) =>
      answer((await loadClient()).PUT('/api/store/{storeId}/categories/{kind}/order', { ...keyed(idempotencyKey), params: { path: { storeId, kind } }, body })),
    remove: async ({ storeId, kind, id, idempotencyKey }) => {
      const { error, response } = await (await loadClient()).DELETE('/api/store/{storeId}/categories/{kind}/{categoryId}', { ...keyed(idempotencyKey), params: { path: { storeId, kind, categoryId: id } } })

      if (!response.ok)
        throw problemOf(response, error)
    },
  }
}
