import type { Access, OnboardingConditions, Store, StoreLanguage, StoreStatus } from '@sk/domain/identity'

// What the identity use cases need. The platform's unit of work fits the generic shape structurally
// (backend/architecture.md).

export interface UnitOfWork<T> {
  run: <R>(work: (tx: T) => Promise<R>) => Promise<R>
}

export interface GuestProfileRepository<T> {
  // The guest profile id for a Better Auth user id, or undefined when there is none yet.
  find: (tx: T, authUserId: string) => Promise<string | undefined>
  // Inserts the profile and returns its id, or returns undefined when another transaction inserted it first.
  insertIfAbsent: (tx: T, authUserId: string) => Promise<string | undefined>
}

export interface AccessRepository<T> {
  // The roles of one Better Auth user across every store. It takes no StoreScope, because it is what the
  // store check reads (architecture D9).
  find: (tx: T, authUserId: string) => Promise<Access>
}

export interface Clock {
  now: () => Date
}

export interface AuditEntry {
  storeId: string | null
  actor: string
  entity: string
  entityId: string
  action: string
  before?: unknown
  after?: unknown
  requestId: string | null
}

export interface AuditLog<T> {
  record: (tx: T, entry: AuditEntry) => Promise<void>
}

export type InvitationRole = 'owner' | 'manager'

export interface Invitation {
  id: string
  storeId: string
  email: string
  role: InvitationRole
  tokenHash: string | null
  expiresAt: Date
  acceptedBy: string | null
  revokedAt: Date | null
}

// The store reads and writes below take a store id, not a StoreScope: they serve the Super Admin across stores
// and the store's own Owner through the id that `requireStoreMember` verified (architecture D9).
export interface StoreRepository<T> {
  // Returns undefined when the slug is taken.
  insert: (tx: T, store: { slug: string, name: string, defaultLanguage: StoreLanguage }) => Promise<Store | undefined>
  find: (tx: T, storeId: string) => Promise<Store | undefined>
  // Locks the store's row until the transaction ends.
  findForUpdate: (tx: T, storeId: string) => Promise<Store | undefined>
  // Newest first by id (UUIDv7), after the given id.
  list: (tx: T, page: { limit: number, after?: string | undefined }) => Promise<Store[]>
  updateInformation: (tx: T, storeId: string, changes: { name?: string, defaultLanguage?: StoreLanguage }, at: Date) => Promise<Store | undefined>
  // Changes the status only when it is `from` now. Returns whether it changed.
  moveStatus: (tx: T, storeId: string, from: StoreStatus, to: StoreStatus, at: Date) => Promise<boolean>
}

export interface InvitationRepository<T> {
  insert: (tx: T, invitation: { storeId: string, email: string, role: InvitationRole, expiresAt: Date }) => Promise<Invitation>
  // Both lock the invitation's row until the transaction ends.
  findForUpdate: (tx: T, invitationId: string) => Promise<Invitation | undefined>
  findByTokenHashForUpdate: (tx: T, tokenHash: string) => Promise<Invitation | undefined>
  // The newest Owner invitation of each store, by store id.
  newestOwnerInvitations: (tx: T, storeIds: string[]) => Promise<Map<string, Invitation>>
  newestOwnerInvitationForUpdate: (tx: T, storeId: string) => Promise<Invitation | undefined>
  // Resend: a new expiry, and no token until the next mail is sent, so the old link stops working now.
  renew: (tx: T, invitationId: string, expiresAt: Date) => Promise<void>
  setTokenHash: (tx: T, invitationId: string, tokenHash: string) => Promise<void>
  // Sets accepted_by only while it is null, the invitation is not revoked and has not expired. Returns whether it did.
  markAccepted: (tx: T, invitationId: string, userId: string, now: Date) => Promise<boolean>
}

export interface MembershipRepository<T> {
  // Returns false when the user is already a member of the store.
  insertIfAbsent: (tx: T, membership: { userId: string, storeId: string, role: InvitationRole, acceptedAt: Date }) => Promise<boolean>
}

// Better Auth's `user` table, which the identity module owns.
export interface UserDirectory<T> {
  find: (tx: T, userId: string) => Promise<{ email: string, emailVerified: boolean } | undefined>
  findByEmail: (tx: T, email: string) => Promise<{ id: string } | undefined>
}

export interface PlatformAdminRepository<T> {
  has: (tx: T, userId: string) => Promise<boolean>
  // The first grant has no granting user, so `granted_by` stays null.
  insertFirst: (tx: T, userId: string) => Promise<void>
}

// A02's three conditions that other stories decide (architecture section 5). The pending source answers
// `pending` for each until E4.12 (the payment account), E2.5 (a product or a tour) and E2.6 (the policies) replace it.
export type LaterConditions = Pick<OnboardingConditions, 'payment-account' | 'catalogue' | 'policies'>

export interface ConditionSource<T> {
  laterConditions: (tx: T, storeId: string) => Promise<LaterConditions>
}
