import type { StoreStatus } from '@sk/domain/identity'
import type { AuditLog, Clock, InvitationRepository, InvitationRole, MembershipRepository, StoreRepository, UnitOfWork, UserDirectory } from '../ports.ts'
import { invitationState, normaliseEmail } from '@sk/domain/identity'
import { hashInvitationToken } from './invitation-token.ts'

export interface AcceptInvitationDeps<T> {
  uow: UnitOfWork<T>
  invitations: InvitationRepository<T>
  stores: StoreRepository<T>
  memberships: MembershipRepository<T>
  users: UserDirectory<T>
  audit: AuditLog<T>
  clock: Clock
}

export type AcceptInvitationResult
  = | { ok: true, storeId: string, role: InvitationRole, storeStatus: StoreStatus }
    | { ok: false, reason: 'invitation-not-found' | 'invitation-email-mismatch' | 'invitation-email-unverified' | 'invitation-already-accepted' | 'invitation-expired' | 'already-a-member' }

// Raised inside the transaction to undo the acceptance when the user already belongs to the store.
class AlreadyAMember extends Error {}

// A signed-in user takes an invitation with the token from the link (section 8, section 9). The row is locked
// from the lookup to the commit, so of two parallel accepts the second waits, then finds it accepted. The
// refusals come in an order that reveals nothing to someone else: an unknown token says nothing, and a different
// signed-in address is told it is a different address before it learns whether the invitation is open. The
// invited address is never returned. An Owner invitation also moves the store from `invited` to `onboarding`.
export function makeAcceptInvitation<T>({ uow, invitations, stores, memberships, users, audit, clock }: AcceptInvitationDeps<T>) {
  return async (actor: { userId: string }, token: string, requestId: string | null): Promise<AcceptInvitationResult> => {
    try {
      return await uow.run(async (tx): Promise<AcceptInvitationResult> => {
        const now = clock.now()
        const invitation = await invitations.findByTokenHashForUpdate(tx, hashInvitationToken(token))
        if (!invitation)
          return { ok: false, reason: 'invitation-not-found' }
        const user = await users.find(tx, actor.userId)
        if (!user || normaliseEmail(user.email) !== invitation.email)
          return { ok: false, reason: 'invitation-email-mismatch' }
        // Better Auth verified the address by the code or by Google. An address Google did not verify is no proof.
        if (!user.emailVerified)
          return { ok: false, reason: 'invitation-email-unverified' }
        const state = invitationState(invitation, now)
        if (state === 'accepted')
          return { ok: false, reason: 'invitation-already-accepted' }
        if (state === 'expired')
          return { ok: false, reason: 'invitation-expired' }
        if (!await invitations.markAccepted(tx, invitation.id, actor.userId, now))
          return { ok: false, reason: 'invitation-already-accepted' }
        if (!await memberships.insertIfAbsent(tx, { userId: actor.userId, storeId: invitation.storeId, role: invitation.role, acceptedAt: now }))
          throw new AlreadyAMember()
        const by = `user:${actor.userId}`
        await audit.record(tx, { storeId: invitation.storeId, actor: by, entity: 'store_invitation', entityId: invitation.id, action: 'accepted', after: { role: invitation.role }, requestId })
        let status = (await stores.find(tx, invitation.storeId))?.status
        if (invitation.role === 'owner' && await stores.moveStatus(tx, invitation.storeId, 'invited', 'onboarding', now)) {
          status = 'onboarding'
          await audit.record(tx, { storeId: invitation.storeId, actor: by, entity: 'store', entityId: invitation.storeId, action: 'status-changed', before: { status: 'invited' }, after: { status: 'onboarding' }, requestId })
        }
        if (!status)
          throw new Error('The invitation points at a store that does not exist')
        return { ok: true, storeId: invitation.storeId, role: invitation.role, storeStatus: status }
      })
    }
    catch (error) {
      if (error instanceof AlreadyAMember)
        return { ok: false, reason: 'already-a-member' }
      throw error
    }
  }
}
