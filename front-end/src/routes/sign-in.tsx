import { createFileRoute } from '@tanstack/react-router'

import { SignInScreen } from '@/features/auth/components/sign-in-screen'
import { safeReturnTo } from '@/features/auth/lib/return-to'
import { noIndexHead } from '@/lib/no-index'

// C05 Sign in (1.6r): a full screen outside the guest shell so it can take two columns from 1024px.
// `returnTo` is where the guest lands after sign-in (default: Account). `error` is the code Better Auth
// sends when a Google sign-in failed (`takeGoogleReturn` moved `/sign-in?error=` into the hash under hash history; E3.4 removes it).
export const Route = createFileRoute('/sign-in')({
  ssr: false,
  head: noIndexHead,
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
