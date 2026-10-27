import type { Language } from '@sk/domain/shared'
import { redirect } from '@tanstack/react-router'
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

interface RedirectLocation {
  pathname: string
  searchStr: string
  hash: string
}

/** Throws a 302 from an old guest path to the same path under the guest's language, keeping the query and the hash. */
export function redirectLegacyGuestPath(location: RedirectLocation): never {
  const target = legacyGuestTarget(location.pathname, requestLanguage())

  if (!target)
    throw new Error(`Not a legacy guest path: ${location.pathname}`)

  const hash = location.hash ? '#'.concat(location.hash) : ''

  throw redirect({ href: `${target}${location.searchStr}${hash}`, statusCode: 302 })
}

/** Throws a 302 from `/` to the language home. */
export function redirectToLanguageHome(): never {
  throw redirect({ href: `/${requestLanguage()}`, statusCode: 302 })
}
