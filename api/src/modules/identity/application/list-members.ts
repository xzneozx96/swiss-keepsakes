import type { Actor } from '@sk/domain/identity'
import type { Clock, InvitationRepository, MembershipRepository, UnitOfWork } from '../ports.ts'
import type { MemberInvitationView, MemberView } from './member-view.ts'
import { can } from '@sk/domain/identity'
import { memberInvitationView, memberView } from './member-view.ts'

export interface ListMembersDeps<T> {
  uow: UnitOfWork<T>
  memberships: MembershipRepository<T>
  invitations: InvitationRepository<T>
  clock: Clock
}

export type ListMembersResult
  = | { ok: true, members: MemberView[], invitations: MemberInvitationView[] }
    | { ok: false, reason: 'forbidden' }

// M22's members tab (UX L208, L440). Only an Owner sees who belongs to the store and who was invited.
export function makeListMembers<T>({ uow, memberships, invitations, clock }: ListMembersDeps<T>) {
  return async (actor: Actor, storeId: string): Promise<ListMembersResult> => {
    if (actor.kind !== 'staff' || !can(actor, 'manage-members', { storeId }))
      return { ok: false, reason: 'forbidden' }
    return uow.run(async (tx) => {
      const now = clock.now()
      const members = await memberships.list(tx, storeId)
      const pending = await invitations.listPendingManagers(tx, storeId)
      return { ok: true, members: members.map(memberView), invitations: pending.map(invitation => memberInvitationView(invitation, now)) }
    })
  }
}
