import { resolveLandingLanguage } from '@/lib/language-routing'

const MAX_TARGET_LENGTH = 200
const PRINTABLE_ASCII = /^[\x21-\x7E]+$/
// The first segment is exactly en or de, then the end, a slash or a query.
const LANGUAGE_SEGMENT = /^\/(?:en|de)(?:[/?]|$)/
// An empty segment, a backslash, a dot segment, or an encoded dot, backslash or control character.
const FORBIDDEN = /\/\/|\\|%2e|%5c|%[01][0-9a-f]|(?:^|\/)\.{1,2}(?:[/?]|$)/i

/** The path a referral link may send the guest to, or null. The `to` value is untrusted, so only same-site language paths pass. */
export function referralTarget(to: string | null): string | null {
  if (!to || to.length > MAX_TARGET_LENGTH || !PRINTABLE_ASCII.test(to))
    return null
  return LANGUAGE_SEGMENT.test(to) && !FORBIDDEN.test(to) ? to : null
}

/** The `Location` of the referral redirect. It reads only `to` and the language headers, never the code, so every code gives the same answer. */
export function referralLocation(request: Request): string {
  const target = referralTarget(new URL(request.url).searchParams.get('to'))
  if (target)
    return target
  const language = resolveLandingLanguage({
    cookie: request.headers.get('cookie'),
    acceptLanguage: request.headers.get('accept-language'),
  })
  return `/${language}`
}
