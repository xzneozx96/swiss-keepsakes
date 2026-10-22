import { Skeleton } from '@heroui/react'
import { useEffect, useState } from 'react'

import { EmptyState } from '@/components/empty-state'
import { InfoIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from '@/features/data-client/errors'
import { apiEnabled } from '@/lib/api-mode'
import { useOnboarding } from '../api/queries'
import { useAcceptInvitation } from '../hooks/use-accept-invitation'
import { useGoToSignIn } from '../hooks/use-go-to-sign-in'
import { forgetStore, rememberedStore } from '../lib/owner-store'
import { ONBOARDING_PATH } from '../lib/search-params'
import { OnboardingChecklist } from './onboarding-checklist'
import { OpenForSale } from './open-for-sale'
import { ProblemNotice } from './problem-notice'
import { RefusalView } from './refusal-view'
import { ScreenFrame } from './screen-frame'
import { StoreInformationForm } from './store-information-form'

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
  const { state, retry } = useAcceptInvitation()
  const [remembered] = useState(rememberedStore)

  if (state.kind === 'accepting') {
    return (
      <ScreenFrame title={t('stores.onboarding.title')}>
        <p aria-live="polite" className="text-sm text-muted" role="status">{t('stores.onboarding.accepting')}</p>
        <Skeleton className="h-24 w-full rounded-3xl" />
      </ScreenFrame>
    )
  }
  if (state.kind === 'accepted') {
    return state.accepted.role === 'owner'
      ? <OnboardingView storeId={state.accepted.storeId} />
      : (
          <ScreenFrame title={t('stores.onboarding.title')}>
            <p className="text-sm text-muted" role="status">{t('stores.onboarding.manager')}</p>
          </ScreenFrame>
        )
  }
  if (state.kind === 'refused') {
    const used = state.refusal === 'accepted' || state.refusal === 'member'

    return used && remembered
      ? <OnboardingView storeId={remembered} />
      : <RefusalView refusal={state.refusal} onRetry={retry} />
  }

  return remembered ? <OnboardingView storeId={remembered} /> : <RefusalView refusal="missing" />
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
    if (notYours)
      forgetStore()
  }, [signedOut, notYours, goToSignIn])

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
        <Skeleton className="h-40 w-full rounded-3xl" />
        <Skeleton className="h-24 w-full rounded-3xl" />
      </ScreenFrame>
    )
  }
  const { store, conditions } = query.data

  return (
    <ScreenFrame intro={store.name} title={t('stores.onboarding.title')}>
      <OnboardingChecklist conditions={conditions} />
      <StoreInformationForm store={store} />
      <OpenForSale onboarding={query.data} />
    </ScreenFrame>
  )
}
