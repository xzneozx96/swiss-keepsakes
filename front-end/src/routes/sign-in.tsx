import { createFileRoute } from '@tanstack/react-router'

import { SignInScreen } from '@/features/auth/components/sign-in-screen'
import { safeReturnTo } from '@/features/auth/lib/return-to'

// C05 Sign in (1.6r): a full screen outside the guest shell so it can take two columns from 1024px.
// `returnTo` is where the guest lands after sign-in (default: Account). `google=failed` is where
// Neon Auth sends the guest back when Google sign-in did not finish.
export const Route = createFileRoute('/sign-in')({
  validateSearch: (
    search: Record<string, unknown>,
  ): { returnTo?: string, google?: 'failed' } => ({
    returnTo: typeof search.returnTo === 'string' ? search.returnTo : undefined,
    google: search.google === 'failed' ? 'failed' : undefined,
  }),
  component: SignInPage,
})

function SignInPage() {
  const { returnTo, google } = Route.useSearch()

  return (
    <SignInScreen
      googleFailed={google === 'failed'}
      returnTo={safeReturnTo(returnTo)}
    />
  )
}
