import { createFileRoute } from '@tanstack/react-router'

import { SignInScreen } from '@/features/auth/components/sign-in-screen'
import { safeReturnTo } from '@/features/auth/lib/return-to'

// C05 Sign in (1.6r): a full screen outside the guest shell so it can take two columns from 1024px.
// `returnTo` is where the guest lands after sign-in (default: Account). `error` is the code Better Auth
// sends when a Google sign-in failed (main.tsx moves `/sign-in?error=` into the hash first).
export const Route = createFileRoute('/sign-in')({
  validateSearch: (
    search: Record<string, unknown>,
  ): { returnTo?: string, error?: string } => ({
    returnTo: typeof search.returnTo === 'string' ? search.returnTo : undefined,
    error: typeof search.error === 'string' ? search.error : undefined,
  }),
  component: SignInPage,
})

function SignInPage() {
  const { returnTo, error } = Route.useSearch()

  return (
    <SignInScreen
      googleFailed={error !== undefined}
      returnTo={safeReturnTo(returnTo)}
    />
  )
}
