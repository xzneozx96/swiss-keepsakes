import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { EmptyState } from '@/components/empty-state'
import { InfoIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { useDemoSelector } from '@/features/demo'
import { apiEnabled } from '@/lib/api-mode'
import { sessionUserQuery } from '../api/queries'
import { useAcceptInvitation } from '../hooks/use-accept-invitation'
import { useDisplayName } from '../hooks/use-display-name'
import { useHeldStoreName } from '../hooks/use-held-store-name'
import { INVITATION_PATH, ONBOARDING_PATH, STORE_PATH } from '../lib/search-params'
import { DisplayNameForm } from './display-name-form'
import { InvitationFrame } from './invitation-frame'
import { InvitationPreview } from './invitation-preview'
import { InvitationLoading } from './invitation-states'
import { RefusalView } from './refusal-view'
import { ScreenFrame } from './screen-frame'
import { InvitationCardSkeleton } from './store-skeletons'

/**
 * M01 (UX 4.12, AC02): the invited Store Manager sees the store, the inviter and the role before sign-in, and
 * accepts with a button. Nothing accepts by itself, so a crafted link cannot join anyone to a store silently.
 */
export function InvitationScreen() {
  const { t } = useLocale()

  if (!apiEnabled) {
    return (
      <ScreenFrame title={t('stores.invite.title')}>
        <EmptyState icon={InfoIcon} message={t('stores.apiOnly')} />
      </ScreenFrame>
    )
  }

  return <InvitationFlow />
}

/** "Sign out and use another account" starts the flow again from the held token, which now meets no session and shows the embedded sign-in. */
function InvitationFlow() {
  const [round, setRound] = useState(0)

  return <InvitationFlowRound key={round} focusTitle={round > 0} onSignedOut={() => setRound(count => count + 1)} />
}

function InvitationFlowRound({ focusTitle, onSignedOut }: { focusTitle: boolean, onSignedOut: () => void }) {
  const { t } = useLocale()
  const { state, token, accept, retry } = useAcceptInvitation(INVITATION_PATH, { manual: true })
  const signedIn = useDemoSelector(s => s.data.signedInGuestId !== null)
  const session = useQuery(sessionUserQuery)
  // The demo flag follows the session only after the first paint, so a visitor whose session has not answered yet is not shown the sign-in form. A user the API found waits for the flag.
  const sessionKnown = signedIn || (!session.isPending && !session.data)
  const storeName = useHeldStoreName(token)

  if (state.kind === 'accepted')
    return <Welcome role={state.accepted.role} />
  if (state.kind === 'refused')
    return <RefusalView refusal={state.refusal} audience={state.role ?? 'manager'} storeName={storeName} onRetry={retry} onSignedOut={onSignedOut} />
  if (!token)
    return <RefusalView refusal="missing" audience="manager" />
  if (!sessionKnown) {
    return (
      <InvitationFrame photo="colour" audience="manager">
        <InvitationLoading text={t('stores.invite.checking')} title={t('stores.invite.title')} />
      </InvitationFrame>
    )
  }

  return (
    <InvitationPreview
      pending={state.kind === 'accepting'}
      returnTo={INVITATION_PATH}
      audience="manager"
      focusTitle={focusTitle}
      signedOut={!signedIn}
      token={token}
      onAccept={accept}
    />
  )
}

/** After the accept: ask for a name if the account has none, then open the store (the Owner's own screen for an Owner link). */
function Welcome({ role }: { role: 'owner' | 'manager' }) {
  const { t } = useLocale()
  const navigate = useNavigate()
  const { loaded, needsName } = useDisplayName()
  const done = () => void navigate({ to: role === 'owner' ? ONBOARDING_PATH : STORE_PATH, replace: true })

  useEffect(() => {
    if (loaded && !needsName)
      void navigate({ to: role === 'owner' ? ONBOARDING_PATH : STORE_PATH, replace: true })
  }, [loaded, needsName, role, navigate])

  return (
    <ScreenFrame title={t('stores.invite.title')}>
      {loaded && needsName
        ? <DisplayNameForm onDone={done} />
        : (
            <>
              <p aria-live="polite" className="text-sm text-muted" role="status">{t('stores.invite.accepting')}</p>
              <InvitationCardSkeleton />
            </>
          )}
    </ScreenFrame>
  )
}
