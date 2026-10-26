/** Areas that stay client-only and out of search results (ADR-001). */
export const PRIVATE_PREFIXES: readonly string[] = ['/store', '/admin', '/partner', '/lab', '/account', '/cart', '/plan', '/sign-in', '/invitation', '/r']

const PARTNER_PREFIX = '/partner'

function isUnder(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

export function isPrivatePath(pathname: string): boolean {
  return PRIVATE_PREFIXES.some(prefix => isUnder(pathname, prefix))
}

/** Response headers for a path: noindex on every private path, and no referrer on the partner report (its token is in the address). */
export function privateHeaders(pathname: string): Record<string, string> {
  if (!isPrivatePath(pathname))
    return {}

  return isUnder(pathname, PARTNER_PREFIX)
    ? { 'X-Robots-Tag': 'noindex', 'Referrer-Policy': 'no-referrer' }
    : { 'X-Robots-Tag': 'noindex' }
}
