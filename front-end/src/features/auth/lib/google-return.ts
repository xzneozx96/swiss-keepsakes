/**
 * Better Auth sends a failed Google sign-in to `<origin>/sign-in?error=<code>` (the API's `onAPIError.errorURL`).
 * The SPA routes with hash history, where the router reads only what follows the `#`, so this gives the
 * address the SPA moves to before the router starts: `/#/sign-in?error=<code>`. It returns undefined for
 * any other address. D3 plans history routing later, which makes this move unnecessary.
 */
export function googleReturnAddress(location: Pick<Location, 'pathname' | 'search'>): string | undefined {
  const sign = '/sign-in'

  if (!location.pathname.endsWith(sign))
    return undefined
  const base = location.pathname.slice(0, -sign.length) || '/'
  const error = new URLSearchParams(location.search).get('error')

  return error ? `${base}#${sign}?${new URLSearchParams({ error })}` : `${base}#${sign}`
}

/** Moves the address once, before the router reads it. */
export function takeGoogleReturn() {
  const address = googleReturnAddress(window.location)

  if (address)
    window.history.replaceState(null, '', address)
}
