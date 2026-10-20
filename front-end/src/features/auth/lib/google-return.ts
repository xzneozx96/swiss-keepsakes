import { safeReturnTo } from './return-to'

/**
 * Better Auth sends a failed Google sign-in to `<origin>/sign-in?returnTo=<path>&error=<code>` (the `errorCallbackURL`
 * the SPA sent, plus the error). The SPA routes with hash history, where the router reads only what follows the `#`,
 * so this gives the address the SPA moves to before the router starts: `/#/sign-in?returnTo=<path>&error=<code>`.
 * It returns undefined for any other address, and for one whose path starts with `//`, which `replaceState`
 * would refuse as another origin. D3 plans history routing later, which makes this move unnecessary.
 */
export function googleReturnAddress(location: Pick<Location, 'pathname' | 'search'>): string | undefined {
  const sign = '/sign-in'

  if (!location.pathname.endsWith(sign))
    return undefined
  const base = location.pathname.slice(0, -sign.length)

  if (base.startsWith('//'))
    return undefined
  const search = new URLSearchParams(location.search)
  const params = new URLSearchParams()
  const returnTo = search.get('returnTo')
  const error = search.get('error')

  if (returnTo)
    params.set('returnTo', safeReturnTo(returnTo))
  if (error)
    params.set('error', error)

  return `${base || '/'}#${sign}${params.size > 0 ? `?${params}` : ''}`
}

// The error is also taken out of the address once the screen has read it. If the screen mounts again after that (the
// router shows its pending screen while a chunk loads), the message must not vanish with the address, so the first read
// is kept here until the guest starts something else.
let googleFailed = false

/** True from a failed Google return until the guest sends a code, starts Google again or changes the email. */
export function googleReturnFailed(): boolean {
  return googleFailed
}

export function clearGoogleReturnFailure() {
  googleFailed = false
}

/** Moves the address once, before the router reads it. The app starts either way. */
export function takeGoogleReturn() {
  try {
    const address = googleReturnAddress(window.location)

    if (address) {
      window.history.replaceState(null, '', address)
      googleFailed = new URLSearchParams(window.location.hash.split('?')[1]).has('error')
    }
  }
  catch (error) {
    console.error('The sign-in address could not be moved', error)
  }
}
