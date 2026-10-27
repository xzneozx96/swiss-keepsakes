// A backslash or a control character (tab, newline) is dropped or turned into `/` by the browser's URL parser, so `/\evil.com` can become `//evil.com`.
// eslint-disable-next-line no-control-regex
const UNSAFE = /[\\\u0000-\u001F\u007F]/

function isUnsafe(value: string): boolean {
  if (UNSAFE.test(value))
    return true
  try {
    return UNSAFE.test(decodeURIComponent(value))
  }
  catch {
    return true
  }
}

/**
 * Where the sign-in screen goes after sign-in. Only in-app paths are accepted, so a crafted
 * link cannot send the guest to another site or loop back into sign-in.
 */
export function safeReturnTo(value: string | undefined): string {
  if (
    !value
    || !value.startsWith('/')
    || value.startsWith('//')
    || isUnsafe(value)
  ) {
    return '/account'
  }

  // The server has no `window`; the base only has to be the same one the parsed address is compared with.
  const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin
  let url: URL

  try {
    url = new URL(value, origin)
  }
  catch {
    return '/account'
  }
  let path: string

  try {
    path = decodeURIComponent(url.pathname).toLowerCase()
  }
  catch {
    return '/account'
  }
  if (
    url.origin !== origin
    || !path.startsWith('/')
    || path.startsWith('//')
    || path.startsWith('/sign-in')
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

  return `${window.location.origin}/sign-in?${search}`
}

/**
 * Where Better Auth sends the browser when Google sign-in fails, on our own origin. It adds `error=<code>`. The
 * address is a real `/sign-in` route, so the sign-in screen reads `error` from its search.
 */
export function signInErrorUrl(returnTo: string): string {
  return `${window.location.origin}/sign-in?${new URLSearchParams({ returnTo })}`
}
