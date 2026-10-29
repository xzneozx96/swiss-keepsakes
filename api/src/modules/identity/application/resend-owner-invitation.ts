import type { StoreLanguage } from '@sk/domain/identity'
import type { MailRequest } from '../../notifications/index.ts'
import type { AuditLog, Clock, ConditionSource, InvitationRepository, StoreRepository, UnitOfWork } from '../ports.ts'
import type { AdminStoreView } from './admin-store-view.ts'
import { invitationLifetimeMs } from '@sk/domain/identity'
import { adminStoreView } from './admin-store-view.ts'
import { onboardingConditions } from './get-onboarding.ts'

export interface ResendOwnerInvitationDeps<T> {
  uow: UnitOfWork<T>
  stores: StoreRepository<T>
  invitations: InvitationRepository<T>
  conditions: ConditionSource<T>
  queueMail: (tx: T, request: MailRequest) => Promise<string>
  audit: AuditLog<T>
  clock: Clock
}

export type ResendOwnerInvitationResult
  = | { ok: true, store: AdminStoreView }
    | { ok: false, reason: 'store-not-found' | 'invitation-not-found' | 'invitation-already-accepted' | 'invitation-revoked' }

// Sends the Owner invitation again (A01, UX R13). The same row lives on for 7 more days, which also reopens an
// expired one, and its token is cleared in the same transaction, so the old link stops working now.
// The new mail mints the next token when the worker sends it, and only that link works (section 8).
export function makeResendOwnerInvitation<T>({ uow, stores, invitations, conditions, queueMail, audit, clock }: ResendOwnerInvitationDeps<T>) {
  return async (actor: { userId: string }, storeId: string, language: StoreLanguage | undefined, requestId: string | null): Promise<ResendOwnerInvitationResult> => uow.run(async (tx) => {
    const now = clock.now()
    const store = await stores.find(tx, storeId)
    if (!store)
      return { ok: false, reason: 'store-not-found' }
    const invitation = await invitations.newestOwnerInvitationForUpdate(tx, storeId)
    if (!invitation)
      return { ok: false, reason: 'invitation-not-found' }
    if (invitation.acceptedBy !== null)
      return { ok: false, reason: 'invitation-already-accepted' }
    if (invitation.revokedAt !== null)
      return { ok: false, reason: 'invitation-revoked' }
    const expiresAt = new Date(now.getTime() + invitationLifetimeMs)
    await invitations.renew(tx, storeId, invitation.id, expiresAt, actor.userId)
    await queueMail(tx, { template: 'N20', to: invitation.email, language: language ?? store.defaultLanguage, storeId, params: { store: store.name, invitationId: invitation.id, expiresOn: expiresAt.toISOString() } })
    await audit.record(tx, { storeId, actor: `super_admin:${actor.userId}`, entity: 'store_invitation', entityId: invitation.id, action: 'resent', requestId })
    return { ok: true, store: adminStoreView(store, { ...invitation, tokenHash: null, expiresAt, invitedBy: actor.userId }, await onboardingConditions(conditions, tx, store), now) }
  })
}
