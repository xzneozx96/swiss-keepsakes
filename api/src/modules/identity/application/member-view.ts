import type { InvitationState } from '@sk/domain/identity'
import type { Invitation, InvitationRole, Member } from '../ports.ts'
import { invitationState } from '@sk/domain/identity'

export interface MemberView {
  id: string
  email: string
  role: InvitationRole
  acceptedAt: string
}

export interface MemberInvitationView {
  id: string
  email: string
  state: InvitationState
  expiresAt: string
}

export function memberView(member: Member): MemberView {
  return { id: member.id, email: member.email.toLowerCase(), role: member.role, acceptedAt: member.acceptedAt.toISOString() }
}

export function memberInvitationView(invitation: Invitation, now: Date): MemberInvitationView {
  return { id: invitation.id, email: invitation.email, state: invitationState(invitation, now), expiresAt: invitation.expiresAt.toISOString() }
}
