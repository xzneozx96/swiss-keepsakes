import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { EmptyState } from '@/components/empty-state'
import { InfoIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { useDemoSelector } from '@/features/demo'
import { apiEnabled } from '@/lib/api-mode'
import { useAcceptInvitation } from '../hooks/use-accept-invitation'
import { useDisplayName } from '../hooks/use-display-name'
import { INVITATION_PATH, ONBOARDING_PATH, STORE_PATH } from '../lib/search-params'
import { DisplayNameForm } from './display-name-form'
import { InvitationPreview } from './invitation-preview'
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

  return <InvitationFlowRound key={round} onSignedOut={() => setRound(count => count + 1)} />
}

function InvitationFlowRound({ onSignedOut }: { onSignedOut: () => void }) {
  const { state, token, accept, retry } = useAcceptInvitation(INVITATION_PATH, { manual: true })
  const signedIn = useDemoSelector(s => s.data.signedInGuestId !== null)

  if (state.kind === 'accepted')
    return <Welcome role={state.accepted.role} />
  if (state.kind === 'refused')
    return <RefusalView refusal={state.refusal} audience={state.role ?? 'manager'} onRetry={retry} onSignedOut={onSignedOut} />
  if (!token)
    return <RefusalView refusal="missing" audience="manager" />

  return (
    <InvitationPreview
      pending={state.kind === 'accepting'}
      returnTo={INVITATION_PATH}
      audience="manager"
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
