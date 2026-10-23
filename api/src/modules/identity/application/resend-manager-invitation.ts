import type { Actor, StoreLanguage } from '@sk/domain/identity'
import type { MailRequest } from '../../notifications/index.ts'
import type { AuditLog, Clock, InvitationRepository, MembershipRepository, StoreRepository, UnitOfWork, UserDirectory } from '../ports.ts'
import type { MemberInvitationView } from './member-view.ts'
import { can, invitationLifetimeMs } from '@sk/domain/identity'
import { memberInvitationView } from './member-view.ts'

export interface ResendManagerInvitationDeps<T> {
  uow: UnitOfWork<T>
  stores: StoreRepository<T>
  invitations: InvitationRepository<T>
  memberships: MembershipRepository<T>
  users: UserDirectory<T>
  queueMail: (tx: T, request: MailRequest) => Promise<string>
  audit: AuditLog<T>
  clock: Clock
}

export type ResendManagerInvitationResult
  = | { ok: true, invitation: MemberInvitationView }
    | { ok: false, reason: 'forbidden' | 'store-not-found' | 'invitation-not-found' | 'invitation-already-accepted' | 'invitation-revoked' | 'already-a-member' }

// The Owner sends a Store Manager invitation again. The same row lives on for 7 more days, which also reopens an
// expired one, and its token is cleared in the same transaction, so the old link stops working now. The new mail
// mints the next token when the worker sends it, and only that link works (section 8). The store's row is locked
// first, in the same order as the invite, and an address that already belongs to the store is refused, so an old
// row cannot be reopened after a newer invitation was accepted. An invitation of another store is not found.
export function makeResendManagerInvitation<T>({ uow, stores, invitations, memberships, users, queueMail, audit, clock }: ResendManagerInvitationDeps<T>) {
  return async (actor: Actor, storeId: string, invitationId: string, language: StoreLanguage | undefined, requestId: string | null): Promise<ResendManagerInvitationResult> => {
    if (actor.kind !== 'staff' || !can(actor, 'manage-members', { storeId }))
      return { ok: false, reason: 'forbidden' }
    return uow.run(async (tx): Promise<ResendManagerInvitationResult> => {
      const now = clock.now()
      const store = await stores.findForUpdate(tx, storeId)
      if (!store)
        return { ok: false, reason: 'store-not-found' }
      const invitation = await invitations.findManagerInStoreForUpdate(tx, storeId, invitationId)
      if (!invitation)
        return { ok: false, reason: 'invitation-not-found' }
      if (invitation.acceptedBy !== null)
        return { ok: false, reason: 'invitation-already-accepted' }
      if (invitation.revokedAt !== null)
        return { ok: false, reason: 'invitation-revoked' }
      const member = await users.findByEmail(tx, invitation.email)
      if (member && await memberships.has(tx, storeId, member.id))
        return { ok: false, reason: 'already-a-member' }
      const expiresAt = new Date(now.getTime() + invitationLifetimeMs)
      await invitations.renew(tx, storeId, invitation.id, expiresAt, actor.userId)
      const inviter = await users.find(tx, actor.userId)
      await queueMail(tx, { template: 'N18', to: invitation.email, language: language ?? store.defaultLanguage, storeId, params: { inviter: inviter?.name.trim() || inviter?.email || store.name, store: store.name, invitationId: invitation.id } })
      await audit.record(tx, { storeId, actor: `staff:${actor.userId}`, entity: 'store_invitation', entityId: invitation.id, action: 'resent', requestId })
      return { ok: true, invitation: memberInvitationView({ ...invitation, tokenHash: null, expiresAt, invitedBy: actor.userId }, now) }
    })
  }
}
