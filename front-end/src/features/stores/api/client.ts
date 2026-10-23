import type { AcceptedInvitation, AdminStore, AdminStoreList, CreateStore, InvitationPreview, Me, MemberInvitation, Members, Onboarding, Store } from '@sk/api-contract'
import type { Language } from '@sk/domain/shared'

/** A command carries the `Idempotency-Key` of the user's intent (`useIdempotencyKey`), so a retry of it is the same request to the API. */
export type Keyed<T> = T & { idempotencyKey: string }

/**
 * Stores and their first Owner (E2.3). There is no demo implementation: every call goes to the API, and a
 * refusal arrives as an `ApiProblem`.
 */
export interface StoresClient {
  /** One page of A01's list, newest first. `cursor` is the previous page's `nextCursor`. */
  adminStores: (cursor?: string) => Promise<AdminStoreList>
  createStore: (input: Keyed<CreateStore>) => Promise<AdminStore>
  resendOwnerInvitation: (input: Keyed<{ id: string, language?: Language }>) => Promise<AdminStore>
  /** Takes the invitation token of the link. The invitation is for the signed-in user's email. */
  acceptInvitation: (input: Keyed<{ token: string }>) => Promise<AcceptedInvitation>
  /** What M01 and A02 show before sign-in. A public read: the token travels in the body. */
  previewInvitation: (token: string) => Promise<InvitationPreview>
  /** The signed-in user's stores, oldest membership first. */
  me: () => Promise<Me>
  /** Owner only: the members and the open Manager invitations of the store. */
  members: (storeId: string) => Promise<Members>
  inviteManager: (input: Keyed<{ storeId: string, email: string, language?: Language }>) => Promise<MemberInvitation>
  resendManagerInvitation: (input: Keyed<{ storeId: string, invitationId: string, language?: Language }>) => Promise<MemberInvitation>
  revokeManagerInvitation: (input: Keyed<{ storeId: string, invitationId: string }>) => Promise<MemberInvitation>
  removeMember: (input: Keyed<{ storeId: string, memberId: string }>) => Promise<void>
  onboarding: (storeId: string) => Promise<Onboarding>
  updateStoreInformation: (input: Keyed<{ storeId: string, name?: string, defaultLanguage?: Language }>) => Promise<Store>
  openForSale: (input: Keyed<{ storeId: string }>) => Promise<Store>
}
