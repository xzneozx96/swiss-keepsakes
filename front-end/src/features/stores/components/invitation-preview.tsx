import type { InviteRole } from '../lib/refusals'

import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from '@/features/data-client/errors'
import { useInvitationPreview } from '../api/queries'
import { InvitationFrame } from './invitation-frame'
import { InvitationLoading, InvitationProblem, ReadyBody, SignedOutBody } from './invitation-states'
import { RefusalView } from './refusal-view'

/**
 * What the invitation is for, shown before sign-in from the public preview route (the token goes in the body, and
 * the preview never carries the invited address or an expiry). An expired or withdrawn invitation, and a link the
 * API does not know, get their refusal states at once, so nobody signs in for nothing. A visitor who is signed out
 * gets the sign-in form under the invitation; a signed-in one gets the accept button. For an Owner invitation the
 * preview names no inviter, and the screen shows none.
 */
export function InvitationPreview({ token, audience, returnTo, signedOut, pending, focusTitle, onAccept, onSignedIn }: {
  token: string
  audience: InviteRole
  /** Where the embedded sign-in comes back to: the screen of the link. */
  returnTo: string
  /** The visitor has no session, so the screen shows the sign-in form. */
  signedOut: boolean
  pending?: boolean
  /** Move focus to the title once shown: the visitor just signed out here. */
  focusTitle?: boolean
  onAccept: () => void
  /** The embedded code sign-in finished. */
  onSignedIn?: () => void
}) {
  const { t } = useLocale()
  const preview = useInvitationPreview(token)
  const problem = preview.error instanceof ApiProblem ? preview.error : undefined
  const unknown = problem?.status === 404 || problem?.status === 400
  const title = t(audience === 'manager' ? 'stores.invite.title' : 'stores.onboarding.title')

  if (unknown)
    return <RefusalView audience={audience} refusal="notFound" />
  if (preview.isError) {
    return (
      <InvitationFrame photo="colour" audience={audience}>
        <InvitationProblem error={preview.error} title={title} onRetry={() => void preview.refetch()} />
      </InvitationFrame>
    )
  }
  if (!preview.data) {
    return (
      <InvitationFrame photo="colour" audience={audience}>
        <InvitationLoading text={t('stores.invite.checking')} title={title} />
      </InvitationFrame>
    )
  }

  const { storeName, inviterName, state, role: invitedRole } = preview.data

  if (state === 'expired' || state === 'revoked')
    return <RefusalView audience={invitedRole} refusal={state} storeName={storeName} />

  return (
    <InvitationFrame photo="colour" audience={invitedRole} storeName={storeName}>
      {signedOut
        ? <SignedOutBody focusTitle={focusTitle} inviterName={inviterName} returnTo={returnTo} role={invitedRole} storeName={storeName} onSignedIn={onSignedIn} />
        : <ReadyBody accepted={state === 'accepted'} inviterName={inviterName} pending={pending} role={invitedRole} storeName={storeName} onAccept={onAccept} />}
    </InvitationFrame>
  )
}
