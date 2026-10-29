import type { AcceptRefusal, InviteRole } from '../lib/refusals'

import { invitationView } from '../lib/invitation-view'
import { InvitationFrame } from './invitation-frame'
import { RefusalBody } from './invitation-states'

/**
 * One state per way the accept route can refuse, on the invitation's own page. A wrong account keeps the invitation
 * open and its photo in colour; a link that can never work again greys the photo. `onSignedOut` runs after "Sign out
 * and use another account": the screen then shows the embedded sign-in, with the token still held.
 */
export function RefusalView({ refusal, audience = 'owner', storeName, onRetry, onSignedOut }: {
  refusal: AcceptRefusal
  audience?: InviteRole
  storeName?: string
  onRetry?: () => void
  onSignedOut?: () => void
}) {
  const view = invitationView({ role: audience, signedIn: true, refusal })

  return (
    <InvitationFrame photo={view.photo} audience={audience} storeName={storeName}>
      <RefusalBody refusal={refusal} role={audience} onRetry={onRetry} onSignedOut={onSignedOut} />
    </InvitationFrame>
  )
}
