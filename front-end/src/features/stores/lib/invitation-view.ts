import type { AcceptRefusal, InviteRole } from './refusals'

export type InvitationViewKind = 'signedOut' | 'ready' | 'wrongAccount' | 'expired' | 'withdrawn' | 'notFound' | 'used' | 'failed'

export interface InvitationView {
  kind: InvitationViewKind
  /** The link can still work (colour) or never will again (grey). */
  photo: 'colour' | 'grey'
  role: InviteRole
}

/**
 * What the invitation screen is in, from the accept state. A refusal wins; otherwise the visitor is signed out (the
 * embedded sign-in) or signed in and ready to accept. A wrong address, an unverified one, a Super Admin and a
 * failed call leave the invitation open, so the photo keeps its colour. Expired, withdrawn, used, a member's and an
 * unknown link need a new invitation, so the photo greys out.
 */
export function invitationView({ role, signedIn, refusal }: { role: InviteRole, signedIn: boolean, refusal?: AcceptRefusal }): InvitationView {
  if (!refusal)
    return { kind: signedIn ? 'ready' : 'signedOut', photo: 'colour', role }
  switch (refusal) {
    case 'mismatch':
    case 'unverified':
    case 'superAdmin':
      return { kind: 'wrongAccount', photo: 'colour', role }
    case 'failed':
      return { kind: 'failed', photo: 'colour', role }
    case 'expired':
      return { kind: 'expired', photo: 'grey', role }
    case 'revoked':
      return { kind: 'withdrawn', photo: 'grey', role }
    case 'accepted':
    case 'member':
      return { kind: 'used', photo: 'grey', role }
    default:
      return { kind: 'notFound', photo: 'grey', role }
  }
}
