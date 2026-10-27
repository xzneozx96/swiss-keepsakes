import type { Language } from '@sk/domain/shared'
import { notFound, redirect } from '@tanstack/react-router'
import { createIsomorphicFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

import { legacyGuestTarget, resolveLandingLanguage } from '@/lib/language-routing'

/** The language a guest lands in: the cookie first, then the browser language. The server reads the request headers; the browser reads its own. */
export const requestLanguage = createIsomorphicFn()
  .server((): Language => resolveLandingLanguage({
    cookie: getRequestHeader('cookie'),
    acceptLanguage: getRequestHeader('accept-language'),
  }))
  .client((): Language => resolveLandingLanguage({
    cookie: document.cookie,
    acceptLanguage: navigator.language,
  }))

const QUERY_AND_HASH = /[?#].*$/

interface RedirectLocation {
  pathname: string
  href: string
}

/** Throws a 302 from an old guest path to the same path under the guest's language, keeping the query and the hash. */
export function redirectLegacyGuestPath(location: RedirectLocation): never {
  const target = legacyGuestTarget(location.pathname, requestLanguage())

  if (!target)
    throw notFound()

  // The query and the hash are everything in `href` from the first `?` or `#`. (`pathname` is decoded, so its length cannot cut `href`.)
  const tail = QUERY_AND_HASH.exec(location.href)?.[0] ?? ''

  throw redirect({ href: `${target}${tail}`, statusCode: 302 })
}

/** Throws a 302 from `/` to the language home. */
export function redirectToLanguageHome(): never {
  throw redirect({ href: `/${requestLanguage()}`, statusCode: 302 })
}
