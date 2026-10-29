import type { StoresClient } from './client'

import { answer, keyed, loadClient, problemOf, timeout } from '@/features/data-client/api-transport'
import { dropInvitationToken } from '../lib/invitation-token'
import { acceptRefusal, spentToken } from '../lib/refusals'

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
    // What the answer means for the held token happens here, not in the screen: the
    // screen may be gone when the answer arrives, and the token must not outlive a use.
    acceptInvitation: async ({ token, idempotencyKey }) => {
      try {
        const accepted = await answer((await loadClient()).POST('/api/me/invitations/accept', { ...keyed(idempotencyKey), body: { token } }))

        dropInvitationToken(token)

        return accepted
      }
      catch (error) {
        if (error instanceof Error && spentToken(acceptRefusal(error)))
          dropInvitationToken(token)
        throw error
      }
    },
    previewInvitation: async token =>
      answer((await loadClient()).POST('/api/public/invitations/preview', { ...timeout(), body: { token } })),
    me: async () => answer((await loadClient()).GET('/api/me', timeout())),
    members: async storeId =>
      answer((await loadClient()).GET('/api/store/{storeId}/members', { ...timeout(), params: { path: { storeId } } })),
    inviteManager: async ({ storeId, idempotencyKey, ...body }) =>
      answer((await loadClient()).POST('/api/store/{storeId}/member-invitations', { ...keyed(idempotencyKey), params: { path: { storeId } }, body })),
    resendManagerInvitation: async ({ storeId, invitationId, language, idempotencyKey }) =>
      answer((await loadClient()).POST('/api/store/{storeId}/member-invitations/{invitationId}/resend', {
        ...keyed(idempotencyKey),
        params: { path: { storeId, invitationId } },
        body: language ? { language } : {},
      })),
    revokeManagerInvitation: async ({ storeId, invitationId, idempotencyKey }) =>
      answer((await loadClient()).POST('/api/store/{storeId}/member-invitations/{invitationId}/revoke', { ...keyed(idempotencyKey), params: { path: { storeId, invitationId } } })),
    removeMember: async ({ storeId, memberId, idempotencyKey }) => {
      const { error, response } = await (await loadClient()).DELETE('/api/store/{storeId}/members/{memberId}', { ...keyed(idempotencyKey), params: { path: { storeId, memberId } } })

      if (!response.ok)
        throw problemOf(response, error)
    },
    onboarding: async storeId =>
      answer((await loadClient()).GET('/api/store/{storeId}/onboarding', { ...timeout(), params: { path: { storeId } } })),
    updateStoreInformation: async ({ storeId, idempotencyKey, ...body }) =>
      answer((await loadClient()).PATCH('/api/store/{storeId}/information', { ...keyed(idempotencyKey), params: { path: { storeId } }, body })),
    openForSale: async ({ storeId, idempotencyKey }) =>
      answer((await loadClient()).POST('/api/store/{storeId}/open-for-sale', { ...keyed(idempotencyKey), params: { path: { storeId } } })),
  }
}
