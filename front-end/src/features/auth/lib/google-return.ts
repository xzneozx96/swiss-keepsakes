// Better Auth sends a failed Google sign-in to `/sign-in?returnTo=<path>&error=<code>`, a real route. The sign-in screen
// takes the error out of the address once it has read it. If the screen mounts again after that (the router shows its
// pending screen while a chunk loads), the message must not vanish with the address, so the screen remembers the
// failure here until the guest starts something else.
let googleFailed = false

/** True from a failed Google return until the guest sends a code, starts Google again or changes the email. */
export function googleReturnFailed(): boolean {
  return googleFailed
}

/** Called by the sign-in screen before it strips `error` from the address. */
export function rememberGoogleReturnFailure() {
  googleFailed = true
}

export function clearGoogleReturnFailure() {
  googleFailed = false
}
