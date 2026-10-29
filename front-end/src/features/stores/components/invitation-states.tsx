import type { Ref } from 'react'
import type { AcceptRefusal, InviteRole } from '../lib/refusals'
import type { StatusTone } from '@/components/status-chip'
import type { MessageKey } from '@/i18n/en'

import { Button, buttonVariants, Skeleton } from '@heroui/react'
import { Link } from '@tanstack/react-router'
import { useEffect, useEffectEvent, useRef } from 'react'

import { InfoIcon } from '@/components/icons'
import { StatusChip } from '@/components/status-chip'
import { useLocale } from '@/contexts/locale-context'
import { SignInForm } from '@/features/auth/components/sign-in-form'
import { useSignIn } from '@/features/auth/hooks/use-sign-in'
import { useSignOut } from '@/features/auth/hooks/use-sign-out'
import { useDemoActions, useDemoSelector } from '@/features/demo'
import { clearGuestData } from '@/features/demo/store'
import { refusalKeys, switchesAccount } from '../lib/refusals'
import { STORE_PATH } from '../lib/search-params'
import { ProblemNotice } from './problem-notice'

/** The wording of a screen: a role label or a chip, the title (the screen's h1) and one line under it. */
function InvitationHead({ eyebrow, chip, title, intro, titleRef }: {
  eyebrow?: string
  chip?: { tone: StatusTone, label: string }
  title: string
  intro: string
  titleRef?: Ref<HTMLHeadingElement>
}) {
  return (
    <div className="flex flex-col gap-2">
      {chip && (
        <span className="self-start">
          <StatusChip tone={chip.tone}>{chip.label}</StatusChip>
        </span>
      )}
      {!chip && eyebrow && <span className="text-sm font-medium text-muted">{eyebrow}</span>}
      <h1 ref={titleRef} className="font-serif text-display text-balance outline-none [overflow-wrap:anywhere]" tabIndex={titleRef ? -1 : undefined}>{title}</h1>
      <p className="text-body text-pretty text-muted [overflow-wrap:anywhere]">{intro}</p>
    </div>
  )
}

/** Mirrors the head, the sign-in note and the first button of the states below. */
export function InvitationLoading({ text, title }: { text: string, title: string }) {
  return (
    <div className="flex flex-col gap-7">
      <h1 className="sr-only">{title}</h1>
      <p aria-live="polite" className="sr-only" role="status">{text}</p>
      <div aria-hidden className="flex flex-col gap-3">
        <Skeleton className="h-4 w-36 rounded-lg" />
        <Skeleton className="h-9 w-4/5 rounded-lg" />
        <Skeleton className="h-5 w-3/4 rounded-lg" />
      </div>
      <Skeleton aria-hidden className="h-12 rounded-xl" />
    </div>
  )
}

/** A failed read of the invitation: the screen's title, then what happened and a retry. */
export function InvitationProblem({ error, title, onRetry }: { error: unknown, title: string, onRetry: () => void }) {
  return (
    <div className="flex flex-col gap-7">
      <h1 className="font-serif text-display text-balance [overflow-wrap:anywhere]">{title}</h1>
      <ProblemNotice error={error} onRetry={onRetry} />
    </div>
  )
}

function storeText(role: InviteRole, storeName: string, inviterName: string | null | undefined, t: ReturnType<typeof useLocale>['t']) {
  const title = t(role === 'owner' ? 'stores.invite.ownerTitle' : 'stores.invite.managerTitle', { store: storeName })
  let intro: string

  if (role === 'owner')
    intro = t('stores.invite.ownerIntro')
  else
    intro = inviterName ? t('stores.invite.from', { inviter: inviterName, store: storeName }) : t('stores.invite.fromUnknown', { store: storeName })

  return { title, intro, eyebrow: t(role === 'owner' ? 'stores.invite.roleOwner' : 'stores.invite.roleManager') }
}

/**
 * The real sign-in form (Google, emailed code) under the invitation. Both come back to `returnTo` with the token
 * still held in `sessionStorage`. `onSignedIn` runs when the code sign-in finishes here (Google leaves the page and
 * returns to it); the Owner screen accepts then. A session the app still thinks is open is dropped first, as the
 * go-to-sign-in step does, so the finish is a real change.
 */
function EmbeddedSignIn({ returnTo, onSignedIn }: { returnTo: string, onSignedIn?: () => void }) {
  const view = useSignIn(returnTo, false)
  const { update } = useDemoActions()
  const signedIn = useDemoSelector(s => s.data.signedInGuestId !== null)
  const wasSignedInRef = useRef(signedIn)

  const watching = onSignedIn !== undefined
  const finished = useEffectEvent(() => onSignedIn?.())

  useEffect(() => {
    if (watching)
      update(s => (s.data.signedInGuestId === null ? s : clearGuestData(s)))
  }, [watching, update])
  useEffect(() => {
    if (signedIn && !wasSignedInRef.current)
      finished()
    wasSignedInRef.current = signedIn
  }, [signedIn])

  return <SignInForm embedded view={view} />
}

/** Signed out: the store, the role and the sign-in form. No expiry is shown, because the preview carries none. */
export function SignedOutBody({ role, storeName, inviterName, returnTo, focusTitle, onSignedIn }: {
  role: InviteRole
  storeName: string
  inviterName?: string | null
  returnTo: string
  focusTitle?: boolean
  onSignedIn?: () => void
}) {
  const { t } = useLocale()
  const text = storeText(role, storeName, inviterName, t)
  const titleRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (focusTitle)
      titleRef.current?.focus()
  }, [focusTitle])

  return (
    <div className="flex flex-col gap-7" data-invitation-state="signedOut">
      <InvitationHead eyebrow={text.eyebrow} intro={text.intro} title={text.title} titleRef={focusTitle ? titleRef : undefined} />
      <div className="flex flex-col gap-5">
        <p className="text-sm text-pretty text-muted">{t('stores.invite.signInHint')}</p>
        <EmbeddedSignIn returnTo={returnTo} onSignedIn={onSignedIn} />
      </div>
    </div>
  )
}

/** Signed in: one button accepts. */
export function ReadyBody({ role, storeName, inviterName, accepted, pending, onAccept }: {
  role: InviteRole
  storeName: string
  inviterName?: string | null
  /** The preview says someone already used this invitation. */
  accepted: boolean
  pending?: boolean
  onAccept: () => void
}) {
  const { t } = useLocale()
  const text = storeText(role, storeName, inviterName, t)

  return (
    <div className="flex flex-col gap-7" data-invitation-state="ready">
      <InvitationHead eyebrow={text.eyebrow} intro={text.intro} title={text.title} />
      <div className="flex flex-col gap-5">
        {accepted && <p className="text-sm text-pretty text-muted">{t('stores.invite.stateAccepted')}</p>}
        <Button fullWidth isPending={pending} size="lg" onPress={onAccept}>{t('stores.invite.accept')}</Button>
      </div>
    </div>
  )
}

const chips: Partial<Record<AcceptRefusal, { tone: StatusTone, key: MessageKey }>> = {
  mismatch: { tone: 'warning', key: 'stores.refusal.chip.mismatch' },
  expired: { tone: 'neutral', key: 'stores.refusal.chip.expired' },
  revoked: { tone: 'neutral', key: 'stores.refusal.chip.revoked' },
}

/**
 * One body per way the invitation refuses. A wrong account keeps the invitation open, so it offers to sign out and
 * sign in again here (`onSignedOut` shows the embedded sign-in, the token still held). A link that can never work
 * again says so and points home. Focus moves to the title when the refusal changes.
 */
export function RefusalBody({ refusal, role, onRetry, onSignedOut }: {
  refusal: AcceptRefusal
  role: InviteRole
  onRetry?: () => void
  onSignedOut?: () => void
}) {
  const { language, t } = useLocale()
  const { signOutThen, pending } = useSignOut()
  const keys = refusalKeys(refusal, role)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const chip = chips[refusal]
  const spent = refusal === 'expired' || refusal === 'revoked'

  useEffect(() => {
    titleRef.current?.focus()
  }, [refusal])

  return (
    <div className="flex flex-col gap-7" data-invitation-state={refusal}>
      <InvitationHead chip={chip && { tone: chip.tone, label: t(chip.key) }} intro={t(keys.text)} title={t(keys.title)} titleRef={titleRef} />
      <div className="flex flex-col gap-5">
        {spent && (
          <p className="flex items-start gap-2 rounded-2xl bg-surface-secondary p-4 text-sm text-pretty">
            <InfoIcon aria-hidden className="mt-0.5 shrink-0 text-muted" size={18} />
            {t('stores.refusal.spentNote')}
          </p>
        )}
        {switchesAccount(refusal) && (
          <Button
            fullWidth
            isPending={pending}
            size="lg"
            variant={refusal === 'mismatch' ? 'primary' : 'secondary'}
            onPress={() => signOutThen(() => onSignedOut?.())}
          >
            {t(refusal === 'superAdmin' ? 'stores.onboarding.signOutOnly' : 'stores.onboarding.signOut')}
          </Button>
        )}
        {refusal === 'failed' && onRetry && (
          <Button fullWidth size="lg" variant="secondary" onPress={onRetry}>{t('stores.problem.retry')}</Button>
        )}
        {refusal === 'member' && (
          <Link className={`${buttonVariants({ variant: 'secondary', size: 'lg' })} w-full`} to={STORE_PATH}>
            {t('stores.refusal.openStore')}
          </Link>
        )}
        {!switchesAccount(refusal) && refusal !== 'failed' && refusal !== 'member' && (
          <Link className={`${buttonVariants({ variant: 'secondary', size: 'lg' })} w-full`} params={{ lang: language }} to="/$lang">
            {t('stores.onboarding.home')}
          </Link>
        )}
      </div>
    </div>
  )
}
