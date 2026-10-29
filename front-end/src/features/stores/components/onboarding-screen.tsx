import type { ReactNode } from 'react'

import { useEffect } from 'react'

import { EmptyState } from '@/components/empty-state'
import { InfoIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from '@/features/data-client/errors'
import { apiEnabled } from '@/lib/api-mode'
import { useMe, useOnboarding } from '../api/queries'
import { useAcceptInvitation } from '../hooks/use-accept-invitation'
import { useGoToSignIn } from '../hooks/use-go-to-sign-in'
import { currentStore } from '../lib/current-store'
import { ONBOARDING_PATH } from '../lib/search-params'
import { DisplayNamePrompt } from './display-name-form'
import { InvitationPreview } from './invitation-preview'
import { OnboardingChecklist } from './onboarding-checklist'
import { OpenForSale } from './open-for-sale'
import { ProblemNotice } from './problem-notice'
import { RefusalView } from './refusal-view'
import { ScreenFrame } from './screen-frame'
import { StoreInformationForm } from './store-information-form'
import { InvitationCardSkeleton, OnboardingSkeleton } from './store-skeletons'

/**
 * A02 (UX 4.12): the invited Owner accepts the invitation after sign-in, sees the four conditions for opening
 * the store, edits the store information and opens it for sale.
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

function InvitationFlow() {
  const { t } = useLocale()
  const { state, token, retry, signIn } = useAcceptInvitation()

  if (state.kind === 'accepting') {
    return (
      <ScreenFrame title={t('stores.onboarding.title')}>
        <p aria-live="polite" className="text-sm text-muted" role="status">{t('stores.onboarding.accepting')}</p>
        <InvitationCardSkeleton />
      </ScreenFrame>
    )
  }
  if (state.kind === 'signIn' && token) {
    return (
      <InvitationPreview
        actionLabel={t('stores.invite.signIn')}
        returnTo={ONBOARDING_PATH}
        audience="owner"
        signedOut
        token={token}
        onAction={signIn}
      />
    )
  }
  if (state.kind === 'previewFailed') {
    return (
      <ScreenFrame title={t('stores.onboarding.title')}>
        <ProblemNotice error={state.error} onRetry={retry} />
      </ScreenFrame>
    )
  }
  if (state.kind === 'accepted' && state.accepted.role === 'owner')
    return <OnboardingView storeId={state.accepted.storeId} />
  if (state.kind === 'refused') {
    const refusal = <RefusalView audience={state.role} refusal={state.refusal} onRetry={retry} />

    return state.refusal === 'member' ? <OwnerStore fallback={refusal} /> : refusal
  }

  return <OwnerStore fallback={<RefusalView refusal="missing" />} />
}

/** A signed-in Owner on a new device finds the store from `GET /api/me`, with no link. A visitor who has not signed in (401) goes to sign-in and comes back here. Anyone else and an answer of 4xx get `fallback`; a lost connection or a 5xx says so, with a retry. */
function OwnerStore({ fallback }: { fallback: ReactNode }) {
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
    return (
      <ScreenFrame title={t('stores.onboarding.title')}>
        <p aria-live="polite" className="sr-only" role="status">{t('stores.onboarding.title')}</p>
        <OnboardingSkeleton />
      </ScreenFrame>
    )
  }
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
  if (!query.data) {
    return (
      <ScreenFrame title={t('stores.onboarding.title')}>
        <p aria-live="polite" className="sr-only" role="status">{t('stores.onboarding.title')}</p>
        <OnboardingSkeleton />
      </ScreenFrame>
    )
  }
  const { store, conditions } = query.data

  return (
    <ScreenFrame intro={store.name} title={t('stores.onboarding.title')}>
      <DisplayNamePrompt />
      <OnboardingChecklist conditions={conditions} />
      <StoreInformationForm store={store} />
      <OpenForSale onboarding={query.data} />
    </ScreenFrame>
  )
}
