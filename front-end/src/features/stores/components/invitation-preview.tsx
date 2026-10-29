import type { InviteRole } from '../lib/refusals'

import { Button } from '@heroui/react'

import { StatusChip } from '@/components/status-chip'
import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from '@/features/data-client/errors'
import { useInvitationPreview } from '../api/queries'
import { ProblemNotice } from './problem-notice'
import { RefusalView } from './refusal-view'
import { ScreenFrame } from './screen-frame'
import { InvitationCardSkeleton } from './store-skeletons'

/**
 * What the invitation is for, shown before sign-in from the public preview route (the token goes in the body, and
 * the preview never carries the invited address). An expired or withdrawn invitation, and a link the API does not
 * know, get their refusal states at once, so nobody signs in for nothing. The action is the screen's: sign in, or
 * accept. For an Owner invitation the preview names no inviter, and the screen shows none.
 */
export function InvitationPreview({ token, audience, returnTo, actionLabel, signedOut, pending, onAction }: {
  token: string
  audience: InviteRole
  returnTo: string
  actionLabel: string
  /** The action is a sign-in, so the screen says which address to use. */
  signedOut: boolean
  pending?: boolean
  onAction: () => void
}) {
  const { t } = useLocale()
  const preview = useInvitationPreview(token)
  const problem = preview.error instanceof ApiProblem ? preview.error : undefined
  const unknown = problem?.status === 404 || problem?.status === 400

  const title = t(audience === 'manager' ? 'stores.invite.title' : 'stores.onboarding.title')

  if (unknown)
    return <RefusalView refusal="notFound" returnTo={returnTo} audience={audience} />
  if (preview.isError) {
    return (
      <ScreenFrame title={title}>
        <ProblemNotice error={preview.error} onRetry={() => void preview.refetch()} />
      </ScreenFrame>
    )
  }
  if (!preview.data) {
    return (
      <ScreenFrame title={title}>
        <p aria-live="polite" className="text-sm text-muted" role="status">{t('stores.invite.checking')}</p>
        <InvitationCardSkeleton />
      </ScreenFrame>
    )
  }

  const { storeName, inviterName, state, role: invitedRole } = preview.data

  if (state === 'expired' || state === 'revoked')
    return <RefusalView refusal={state} returnTo={returnTo} audience={invitedRole} />

  const line = invitedRole === 'owner'
    ? t('stores.invite.ownerFor', { store: storeName })
    : inviterName
      ? t('stores.invite.from', { inviter: inviterName, store: storeName })
      : t('stores.invite.fromUnknown', { store: storeName })

  return (
    <ScreenFrame title={title}>
      <section aria-labelledby="invitation-store" className="flex flex-col items-start gap-3 rounded-3xl bg-surface p-5 shadow-surface" data-invitation-state={state}>
        <StatusChip tone="info">{t(invitedRole === 'owner' ? 'stores.invite.roleOwner' : 'stores.invite.roleManager')}</StatusChip>
        <h2 className="text-heading break-words" id="invitation-store">{storeName}</h2>
        <p className="text-sm break-words text-pretty">{line}</p>
        {state === 'accepted' && <p className="text-sm text-pretty text-muted">{t('stores.invite.stateAccepted')}</p>}
        {signedOut && <p className="text-sm text-pretty text-muted">{t('stores.invite.signInHint')}</p>}
        <Button fullWidth className="min-h-11" isPending={pending} onPress={onAction}>
          {actionLabel}
        </Button>
      </section>
    </ScreenFrame>
  )
}
