import type { StoresClient } from './client'

import { ApiProblem } from '@/features/data-client/errors'
import { dropInvitationToken } from '../lib/invitation-token'
import { rememberStore } from '../lib/owner-store'
import { acceptRefusal, spentToken } from '../lib/refusals'

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

export function createStoresClient(): StoresClient {
  return {
    adminStores: async cursor =>
      answer((await loadClient()).GET('/api/admin/stores', { ...timeout(), params: { query: { cursor } } })),
    createStore: async ({ idempotencyKey, ...body }) =>
      answer((await loadClient()).POST('/api/admin/stores', { ...keyed(idempotencyKey), body })),
    resendOwnerInvitation: async ({ id, language, idempotencyKey }) =>
      answer((await loadClient()).POST('/api/admin/stores/{id}/owner-invitation/resend', {
        ...keyed(idempotencyKey),
        params: { path: { id } },
        body: language ? { language } : {},
      })),
    // What the answer means for the held token and the remembered store happens here, not in the screen: the
    // screen may be gone when the answer arrives, and the token must not outlive a use.
    acceptInvitation: async ({ token, idempotencyKey }) => {
      try {
        const accepted = await answer((await loadClient()).POST('/api/me/invitations/accept', { ...keyed(idempotencyKey), body: { token } }))

        dropInvitationToken(token)
        rememberStore(accepted.storeId)

        return accepted
      }
      catch (error) {
        if (error instanceof Error && spentToken(acceptRefusal(error)))
          dropInvitationToken(token)
        throw error
      }
    },
    onboarding: async storeId =>
      answer((await loadClient()).GET('/api/store/{storeId}/onboarding', { ...timeout(), params: { path: { storeId } } })),
    updateStoreInformation: async ({ storeId, idempotencyKey, ...body }) =>
      answer((await loadClient()).PATCH('/api/store/{storeId}/information', { ...keyed(idempotencyKey), params: { path: { storeId } }, body })),
    openForSale: async ({ storeId, idempotencyKey }) =>
      answer((await loadClient()).POST('/api/store/{storeId}/open-for-sale', { ...keyed(idempotencyKey), params: { path: { storeId } } })),
  }
}
