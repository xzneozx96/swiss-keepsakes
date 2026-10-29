import type { Onboarding } from '@sk/api-contract'
import type { ReactNode } from 'react'

import { Navigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { EmptyState } from '@/components/empty-state'
import { InfoIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from '@/features/data-client/errors'
import { apiEnabled } from '@/lib/api-mode'
import { useMe, useOnboarding } from '../api/queries'
import { useAcceptInvitation } from '../hooks/use-accept-invitation'
import { useDisplayName } from '../hooks/use-display-name'
import { useGoToSignIn } from '../hooks/use-go-to-sign-in'
import { useHeldStoreName } from '../hooks/use-held-store-name'
import { currentStore } from '../lib/current-store'
import { ONBOARDING_PATH } from '../lib/search-params'
import { DisplayNameForm } from './display-name-form'
import { InvitationFrame } from './invitation-frame'
import { InvitationPreview } from './invitation-preview'
import { InvitationLoading, InvitationProblem } from './invitation-states'
import { OnboardingSteps } from './onboarding-steps'
import { ProblemNotice } from './problem-notice'
import { RefusalView } from './refusal-view'
import { ScreenFrame } from './screen-frame'
import { OnboardingSkeleton } from './store-skeletons'

/**
 * A02 (UX 4.12): the invited Owner accepts the invitation after sign-in, then goes through the steps for opening
 * the store (`OnboardingSteps`) and opens it for sale. Anyone who does not belong here leaves for the store area.
 */
export function OnboardingScreen() {
  const { t } = useLocale()

  if (!apiEnabled) {
    return (
      <ScreenFrame title={t('stores.onboarding.title')}>
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
  const { state, token, retry } = useAcceptInvitation()
  const storeName = useHeldStoreName(token)

  if (state.kind === 'accepting') {
    return (
      <InvitationFrame photo="colour" audience="owner">
        <InvitationLoading text={t('stores.onboarding.accepting')} title={t('stores.onboarding.title')} />
      </InvitationFrame>
    )
  }
  if (state.kind === 'signIn' && token) {
    return (
      <InvitationPreview
        returnTo={ONBOARDING_PATH}
        audience="owner"
        focusTitle={focusTitle}
        signedOut
        token={token}
        onAccept={retry}
        onSignedIn={retry}
      />
    )
  }
  if (state.kind === 'previewFailed') {
    return (
      <InvitationFrame photo="colour" audience="owner">
        <InvitationProblem error={state.error} title={t('stores.onboarding.title')} onRetry={retry} />
      </InvitationFrame>
    )
  }
  if (state.kind === 'accepted' && state.accepted.role === 'owner')
    return <OnboardingView storeId={state.accepted.storeId} />
  if (state.kind === 'refused') {
    const refusal = <RefusalView audience={state.role} refusal={state.refusal} storeName={storeName} onRetry={retry} onSignedOut={onSignedOut} />

    return state.refusal === 'member' ? <OwnerStore fallback={refusal} keepManager /> : refusal
  }

  return <OwnerStore fallback={<RefusalView refusal="missing" />} />
}

/**
 * A signed-in Owner on a new device finds the store from `GET /api/me`, with no link. A visitor who has not signed in
 * (401) goes to sign-in and comes back here. A Manager (unless `keepManager`, for the Owner link a member opened) and
 * anyone whose store is already open leave for the store area. Anyone else and an answer of 4xx get `fallback`; a
 * lost connection or a 5xx says so, with a retry.
 */
function OwnerStore({ fallback, keepManager = false }: { fallback: ReactNode, keepManager?: boolean }) {
  const { t } = useLocale()
  const goToSignIn = useGoToSignIn(ONBOARDING_PATH)
  const me = useMe()
  const current = currentStore(me.data)
  const owned = current?.role === 'owner' ? current : undefined
  const signedOut = me.error instanceof ApiProblem && me.error.status === 401

  useEffect(() => {
    if (signedOut)
      goToSignIn()
  }, [signedOut, goToSignIn])

  if (me.isPending || signedOut) {
    return <OnboardingSkeleton title={t('stores.onboarding.title')} />
  }
  if (current && ((current.role === 'manager' && !keepManager) || (current.status !== 'onboarding' && current.status !== 'invited')))
    return <Navigate replace to="/store" />
  if (owned)
    return <OnboardingView storeId={owned.storeId} />
  if (me.isError && !(me.error instanceof ApiProblem && me.error.status < 500)) {
    return (
      <ScreenFrame title={t('stores.onboarding.title')}>
        <ProblemNotice error={me.error} onRetry={() => void me.refetch()} />
      </ScreenFrame>
    )
  }

  return fallback
}

function OnboardingView({ storeId }: { storeId: string }) {
  const { t } = useLocale()
  const goToSignIn = useGoToSignIn(ONBOARDING_PATH)
  const query = useOnboarding(storeId)
  const problem = query.error instanceof ApiProblem ? query.error : undefined
  const signedOut = problem?.status === 401
  const notYours = problem?.status === 403 || problem?.status === 404

  useEffect(() => {
    if (signedOut)
      goToSignIn()
  }, [signedOut, goToSignIn])

  if (notYours)
    return <RefusalView refusal="missing" />
  if (query.isError && !signedOut) {
    return (
      <ScreenFrame title={t('stores.onboarding.title')}>
        <ProblemNotice error={query.error} onRetry={() => void query.refetch()} />
      </ScreenFrame>
    )
  }
  if (!query.data)
    return <OnboardingSkeleton title={t('stores.onboarding.title')} />

  return <OnboardingReady onboarding={query.data} />
}

/** The invitation holds no name, so an Owner whose account has none is asked for it first, once; the steps follow. */
function OnboardingReady({ onboarding }: { onboarding: Onboarding }) {
  const { t } = useLocale()
  const { loaded, needsName } = useDisplayName()
  const [asked, setAsked] = useState(false)

  if (!loaded)
    return <OnboardingSkeleton title={t('stores.onboarding.title')} />
  if (needsName && !asked) {
    return (
      <ScreenFrame title={t('stores.onboarding.title')}>
        <DisplayNameForm onDone={() => setAsked(true)} />
      </ScreenFrame>
    )
  }

  return <OnboardingSteps onboarding={onboarding} />
}
