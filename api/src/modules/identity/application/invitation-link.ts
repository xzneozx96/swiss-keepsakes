import type { InvitationLink, InvitationTemplate } from '../../notifications/index.ts'
import type { Clock, InvitationRepository } from '../ports.ts'
import { invitationState } from '@sk/domain/identity'
import { hashInvitationToken } from './invitation-token.ts'

// Where each invitation mail's link leads in the SPA's hash routes. A02 (N20) is a screen of the store area. M01
// (N18) is outside it, because the invitee holds no store yet and the merchant shell is for members.
export const invitationScreens = { N20: '/store/onboarding', N18: '/invitation' } as const satisfies Record<InvitationTemplate, string>

export interface InvitationLinkDeps<T> {
  invitations: InvitationRepository<T>
  clock: Clock
  newToken: () => string
  // The origin of the SPA (APP_URL), with no path.
  appUrl: string
  screens: Partial<Record<InvitationTemplate, string>>
}

// The identity module's side of the notifications port (section 8). The mail attempt calls it inside its own
// transaction, under the `sent_mail` row lock. It mints a new random token, stores only the token's hash with
// that `tx`, and returns the link with the raw token. The raw token exists only in memory and in the mail. It
// returns nothing for an invitation that is accepted, revoked or expired, so the mail then fails at once. A failed attempt rolls the hash back. It never opens a unit of work, because it runs inside one.
//
// The SPA uses hash routing, so the screen path and the token go after the `#`. A browser sends nothing after
// `#` to the server, so the token reaches no access log, proxy or `Referer` header.
export function makeInvitationLink<T>({ invitations, clock, newToken, appUrl, screens }: InvitationLinkDeps<T>): InvitationLink<T> {
  return async (tx, template, invitationId) => {
    const screen = screens[template]
    if (screen === undefined)
      throw new Error(`No screen is set for the ${template} link`)
    const invitation = await invitations.findForUpdate(tx, invitationId)
    if (!invitation || invitationState(invitation, clock.now()) !== 'open')
      return undefined
    // N20 invites an Owner and N18 a Store Manager. A mismatch is a bug in the command that queued the mail.
    if ((template === 'N20') !== (invitation.role === 'owner'))
      return undefined
    const token = newToken()
    await invitations.setTokenHash(tx, invitation.id, hashInvitationToken(token))
    return `${appUrl}/#${screen}?invitation=${encodeURIComponent(token)}`
  }
}
