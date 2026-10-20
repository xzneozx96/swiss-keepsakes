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
 * The sign-in screen's address on our own origin, where Better Auth sends the browser back after
 * Google. The screen then replaces itself with `returnTo`.
 */
export function signInUrl(returnTo: string): string {
  const search = new URLSearchParams({ returnTo })

  return `${window.location.origin}${window.location.pathname}#/sign-in?${search}`
}

/**
 * Where Better Auth sends the browser when Google sign-in fails, on our own origin. It adds `error=<code>`. The
 * path, not the hash, is what the API's `errorCallbackURL` can carry, so `takeGoogleReturn` moves it into the hash.
 */
export function signInErrorUrl(returnTo: string): string {
  return `${window.location.origin}/sign-in?${new URLSearchParams({ returnTo })}`
}
