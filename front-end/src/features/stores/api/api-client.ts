import type { StoresClient } from './client'

import { ApiProblem } from '@/features/data-client/errors'

/** No call waits longer than this. An abort ends the call like a lost connection does. */
const TIMEOUT_MS = 15_000

// The contract package carries Zod, so it loads on the first call and never with the first paint.
let loaded: Promise<ReturnType<(typeof import('@sk/api-contract'))['createApiClient']>> | undefined

function loadClient() {
  loaded ??= import('@sk/api-contract').then(
    (module) => {
      const client = module.createApiClient(window.location.origin)

      // A new key for every attempt: the API replays the first answer, a refusal included, to a repeated key for 24 hours.
      client.use({
        onRequest: ({ request }) => {
          if (request.method !== 'GET')
            request.headers.set('Idempotency-Key', crypto.randomUUID())

          return request
        },
      })

      return client
    },
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

export function createStoresClient(): StoresClient {
  return {
    adminStores: async cursor =>
      answer((await loadClient()).GET('/api/admin/stores', { ...timeout(), params: { query: { cursor } } })),
    createStore: async body =>
      answer((await loadClient()).POST('/api/admin/stores', { ...timeout(), body })),
    resendOwnerInvitation: async ({ id, language }) =>
      answer((await loadClient()).POST('/api/admin/stores/{id}/owner-invitation/resend', {
        ...timeout(),
        params: { path: { id } },
        body: language ? { language } : {},
      })),
    acceptInvitation: async ({ token }) =>
      answer((await loadClient()).POST('/api/me/invitations/accept', { ...timeout(), body: { token } })),
    onboarding: async storeId =>
      answer((await loadClient()).GET('/api/store/{storeId}/onboarding', { ...timeout(), params: { path: { storeId } } })),
    updateStoreInformation: async ({ storeId, ...body }) =>
      answer((await loadClient()).PATCH('/api/store/{storeId}/information', { ...timeout(), params: { path: { storeId } }, body })),
    openForSale: async ({ storeId }) =>
      answer((await loadClient()).POST('/api/store/{storeId}/open-for-sale', { ...timeout(), params: { path: { storeId } } })),
  }
}
