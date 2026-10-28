/** Areas that stay client-only and out of search results (ADR-001). */
export const PRIVATE_PREFIXES: readonly string[] = ['/store', '/admin', '/partner', '/lab', '/account', '/cart', '/en/plan', '/de/plan', '/sign-in', '/invitation', '/r']

const PARTNER_PREFIX = '/partner'

function isUnder(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

const ESCAPE = /%[0-9a-f]{2}/gi
const REPEATED_SLASHES = /\/{2,}/g

/**
 * The path as the router compares it: each valid %XX decoded on its own (a bad escape stays as written, as in the
 * router's decodePath), repeated slashes made one (`//partner/x` reaches the partner screen) and lower case. The prefixes are ASCII, so this is enough to see an encoded prefix.
 */
function normalizePath(pathname: string): string {
  return pathname
    .replace(ESCAPE, (escape) => {
      try {
        return decodeURIComponent(escape)
      }
      catch {
        return escape
      }
    })
    .replace(REPEATED_SLASHES, '/')
    .toLowerCase()
}

export function isPrivatePath(pathname: string): boolean {
  const path = normalizePath(pathname)
  return PRIVATE_PREFIXES.some(prefix => isUnder(path, prefix))
}

/** Response headers for a path: noindex on every private path, and no referrer on the partner report (its token is in the address). */
export function privateHeaders(pathname: string): Record<string, string> {
  if (!isPrivatePath(pathname))
    return {}

  return isUnder(normalizePath(pathname), PARTNER_PREFIX)
    ? { 'X-Robots-Tag': 'noindex', 'Referrer-Policy': 'no-referrer' }
    : { 'X-Robots-Tag': 'noindex' }
}

/**
 * Runs `next` and sets the private headers on the response it yields. An error that is not a Response would reach Start
 * as a 500 with no headers, so on a private path it is logged and answered with a 500 that has them (the partner token
 * is in the address).
 */
export async function withPrivateHeaders<T extends { response: Response }>(pathname: string, next: () => T | Promise<T>): Promise<T> {
  const headers = privateHeaders(pathname)
  let result: T

  try {
    result = await next()
  }
  catch (error) {
    if (Object.keys(headers).length === 0)
      throw error

    console.error(error)
    throw new Response('Internal Server Error', { status: 500, headers })
  }

  for (const [name, value] of Object.entries(headers))
    result.response.headers.set(name, value)

  return result
}
