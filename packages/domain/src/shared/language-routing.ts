import type { Language } from './language.ts'

const COOKIE_NAME = 'sk_lang'
// The router hands over a decoded pathname (`decodeURI`: %20 is a space, %2F and other reserved escapes stay). Encode again what a Location header cannot carry, the way the router's `encodePathLikeUrl` does.
const WHITESPACE_OR_NON_ASCII = /[\s\u{80}-\u{10FFFF}]/gu
const LEGACY_GUEST_ROOTS = ['stories', 'tours', 'gifts', 'search', 'plan', 'credits']

export function isLanguage(value: unknown): value is Language {
  return value === 'en' || value === 'de'
}

function readLanguageCookie(cookie: string): Language | null {
  for (const part of cookie.split(';')) {
    const [name, value] = part.trim().split('=')
    if (name === COOKIE_NAME && isLanguage(value))
      return value
  }
  return null
}

export function resolveLandingLanguage(input: { cookie?: string | null, acceptLanguage?: string | null }): Language {
  const fromCookie = input.cookie ? readLanguageCookie(input.cookie) : null
  if (fromCookie)
    return fromCookie
  const firstTag = input.acceptLanguage?.split(',')[0]?.trim().toLowerCase() ?? ''
  return firstTag.startsWith('de') ? 'de' : 'en'
}

export function switchLanguagePath(pathname: string, language: Language): string {
  const [, first, ...rest] = pathname.split('/')
  if (!isLanguage(first))
    return pathname
  return `/${[language, ...rest].join('/')}`
}

/** The router matches the first segment without case and with each %XX decoded, so the target is built from the lower-case, decoded root. */
export function legacyGuestTarget(pathname: string, language: Language): string | null {
  const [, rawRoot = '', ...rest] = pathname.split('/')
  let root: string

  try {
    root = decodeURIComponent(rawRoot).toLowerCase()
  }
  catch {
    return null
  }

  return LEGACY_GUEST_ROOTS.includes(root) ? `/${[language, root, ...rest].join('/')}`.replace(WHITESPACE_OR_NON_ASCII, encodeURIComponent) : null
}

export type VersionRule = { kind: 'show' } | { kind: 'redirect', language: Language } | { kind: 'missing' }

/** What a page does for a URL language, given the languages that have a version of it. */
export function pageVersionRule(available: readonly Language[], urlLanguage: Language): VersionRule {
  if (available.includes(urlLanguage))
    return { kind: 'show' }
  const [first] = available
  return first ? { kind: 'redirect', language: first } : { kind: 'missing' }
}
