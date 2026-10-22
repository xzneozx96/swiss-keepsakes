import type { AcceptRefusal } from '../lib/refusals'

import { Button, buttonVariants } from '@heroui/react'
import { Link, useNavigate } from '@tanstack/react-router'

import { InfoIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { useSignOut } from '@/features/auth/hooks/use-sign-out'
import { refusalKeys, switchesAccount } from '../lib/refusals'
import { ONBOARDING_PATH } from '../lib/search-params'
import { ScreenFrame } from './screen-frame'

/**
 * One state per way the accept route can refuse. A wrong account keeps the invitation open, so it offers to
 * sign out and sign in again, and the token stays held for that second sign-in.
 */
export function RefusalView({ refusal, onRetry }: { refusal: AcceptRefusal, onRetry?: () => void }) {
  const { t } = useLocale()
  const navigate = useNavigate()
  const { signOutThen, pending } = useSignOut()
  const keys = refusalKeys(refusal)

  return (
    <ScreenFrame title={t('stores.onboarding.title')}>
      <div className="flex flex-col items-start gap-3 rounded-3xl bg-surface p-5 shadow-surface" role="alert">
        <span aria-hidden className="flex size-12 items-center justify-center rounded-2xl bg-surface-secondary text-muted">
          <InfoIcon size={24} />
        </span>
        <h2 className="text-heading">{t(keys.title)}</h2>
        <p className="text-sm text-pretty text-muted">{t(keys.text)}</p>
        {switchesAccount(refusal) && (
          <Button
            isPending={pending}
            variant="secondary"
            onPress={() => signOutThen(() => void navigate({ to: '/sign-in', search: { returnTo: ONBOARDING_PATH }, replace: true }))}
          >
            {t('stores.onboarding.signOut')}
          </Button>
        )}
        {refusal === 'failed' && onRetry && (
          <Button variant="secondary" onPress={onRetry}>{t('stores.problem.retry')}</Button>
        )}
        {!switchesAccount(refusal) && refusal !== 'failed' && (
          <Link className={buttonVariants({ variant: 'secondary', size: 'sm' })} to="/">
            {t('stores.onboarding.home')}
          </Link>
        )}
      </div>
    </ScreenFrame>
  )
}
