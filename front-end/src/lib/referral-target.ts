import { resolveLandingLanguage } from '@/lib/language-routing'

const MAX_TARGET_LENGTH = 200
const PRINTABLE_ASCII = /^[\x21-\x7E]+$/
// The first segment is exactly en or de, then the end, a slash or a query.
const LANGUAGE_SEGMENT = /^\/(?:en|de)(?:[/?]|$)/
// An empty segment, a backslash, a dot segment (also before a fragment), or an encoded dot, backslash or control character.
const FORBIDDEN = /\/\/|\\|%2e|%5c|%[01][0-9a-f]|(?:^|\/)\.{1,2}(?:[/?#]|$)/i

/** The path a referral link may send the guest to, or null. The `to` value is untrusted, so only same-site language paths pass. */
export function referralTarget(to: string | null): string | null {
  if (!to || to.length > MAX_TARGET_LENGTH || !PRINTABLE_ASCII.test(to))
    return null
  return LANGUAGE_SEGMENT.test(to) && !FORBIDDEN.test(to) ? to : null
}

/** The one fixed marker the redirect adds: the guest shell reads it once into the visit entry and removes it from the address. It names no code and no partner. */
export const PARTNER_VIA = 'via=partner'

function withMarker(target: string): string {
  const hash = target.indexOf('#')
  const path = hash === -1 ? target : target.slice(0, hash)
  const fragment = hash === -1 ? '' : target.slice(hash)

  return `${path}${path.includes('?') ? '&' : '?'}${PARTNER_VIA}${fragment}`
}

/** The `Location` of the referral redirect. It reads only `to` and the language headers, never the code, so every code gives the same answer. The target carries the partner marker. */
export function referralLocation(request: Request): string {
  const target = referralTarget(new URL(request.url).searchParams.get('to'))
  if (target)
    return withMarker(target)
  const language = resolveLandingLanguage({
    cookie: request.headers.get('cookie'),
    acceptLanguage: request.headers.get('accept-language'),
  })
  return withMarker(`/${language}`)
}
