import type { Language } from '@sk/domain/shared'

const COOKIE_NAME = 'sk_lang'
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

export function writeLanguageCookie(language: Language): void {
  document.cookie = `${COOKIE_NAME}=${language}; Path=/; Max-Age=31536000; SameSite=Lax`
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

  return LEGACY_GUEST_ROOTS.includes(root) ? `/${[language, root, ...rest].join('/')}` : null
}
