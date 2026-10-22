import type { Store } from '@sk/domain/identity'
import type { IdentityUseCases } from '../../src/modules/identity/adapters/routes.ts'
import type { AdminStoreView } from '../../src/modules/identity/application/admin-store-view.ts'

const store: Store = { id: '0190f0c2-0000-7000-8000-00000000000a', slug: 'lucerne', name: 'Lucerne Andenken', status: 'onboarding', defaultLanguage: 'en' }

const adminStore: AdminStoreView = { ...store, status: 'invited', invitation: { email: 'owner@example.ch', state: 'open', expiresAt: '2026-10-27T08:00:00.000Z' }, paymentAccount: 'pending' }

const managerInvitation = { id: '0190f0c2-0000-7000-8000-00000000000b', email: 'lena.meier@example.ch', state: 'open', expiresAt: '2026-10-27T08:00:00.000Z' } as const

// Stand-ins for the identity use cases, for tests of the routes' guards over createApp. Each answers as if the
// store existed and the caller could do the thing, so a request that gets past the guard is not a 404 or a 403.
export function createFakeIdentityUseCases(): IdentityUseCases {
  return {
    createStore: async () => ({ ok: true, store: adminStore }),
    listStores: async () => ({ items: [adminStore], nextCursor: null }),
    resendOwnerInvitation: async () => ({ ok: true, store: adminStore }),
    previewInvitation: async () => ({ ok: true, preview: { storeName: store.name, role: 'owner', inviterName: null, state: 'open' } }),
    acceptInvitation: async () => ({ ok: true, storeId: store.id, role: 'owner', storeStatus: 'onboarding' }),
    getOnboarding: async () => ({
      store,
      conditions: [
        { key: 'store-information', state: 'met' },
        { key: 'payment-account', state: 'pending' },
        { key: 'catalogue', state: 'pending' },
        { key: 'policies', state: 'pending' },
      ],
      mayOpenForSale: false,
    }),
    updateStoreInformation: async () => ({ ok: true, store }),
    openStoreForSale: async () => ({ ok: true, store: { ...store, status: 'live' } }),
    listMembers: async () => ({ ok: true, members: [], invitations: [] }),
    inviteManager: async () => ({ ok: true, invitation: managerInvitation }),
    resendManagerInvitation: async () => ({ ok: true, invitation: managerInvitation }),
    revokeInvitation: async () => ({ ok: true, invitation: { ...managerInvitation, state: 'revoked' } }),
    removeMember: async () => ({ ok: true }),
  }
}
