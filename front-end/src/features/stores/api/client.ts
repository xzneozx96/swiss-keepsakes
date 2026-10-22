import type { AcceptedInvitation, AdminStore, AdminStoreList, CreateStore, Onboarding, Store } from '@sk/api-contract'
import type { Language } from '@sk/domain/shared'

/**
 * Stores and their first Owner (E2.3). There is no demo implementation: every call goes to the API, and a
 * refusal arrives as an `ApiProblem`.
 */
export interface StoresClient {
  /** One page of A01's list, newest first. `cursor` is the previous page's `nextCursor`. */
  adminStores: (cursor?: string) => Promise<AdminStoreList>
  createStore: (input: CreateStore) => Promise<AdminStore>
  resendOwnerInvitation: (input: { id: string, language?: Language }) => Promise<AdminStore>
  /** Takes the invitation token of the link. The invitation is for the signed-in user's email. */
  acceptInvitation: (input: { token: string }) => Promise<AcceptedInvitation>
  onboarding: (storeId: string) => Promise<Onboarding>
  updateStoreInformation: (input: { storeId: string, name?: string, defaultLanguage?: Language }) => Promise<Store>
  openForSale: (input: { storeId: string }) => Promise<Store>
}
