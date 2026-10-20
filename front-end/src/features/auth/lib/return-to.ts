/**
 * Where the sign-in screen goes after sign-in. Only in-app paths are accepted, so a crafted
 * link cannot send the guest to another site or loop back into sign-in.
 */
export function safeReturnTo(value: string | undefined): string {
  if (
    !value
    || !value.startsWith('/')
    || value.startsWith('//')
    || value.startsWith('/sign-in')
  ) {
    return '/account'
  }

  return value
}

/**
 * The sign-in screen's full address, where Neon Auth sends the browser back after Google. The
 * screen then replaces itself with `returnTo`. `failed` marks a Google sign-in that did not finish.
 */
export function signInUrl(returnTo: string, google?: 'failed'): string {
  const search = new URLSearchParams({ returnTo })

  if (google)
    search.set('google', google)

  return `${window.location.origin}${window.location.pathname}#/sign-in?${search}`
}
