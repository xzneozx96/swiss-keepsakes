const DEFAULT_SITE_URL = 'http://localhost:3002'
const ROBOTS_TAG = 'X-Robots-Tag'
const TRAILING_SLASHES = /\/+$/
const CRAWLER_FILES: readonly string[] = ['/robots.txt', '/sitemap.xml']

interface SiteEnv {
  VITE_SITE_URL?: string
  VITE_SITE_ENV?: string
}

/**
 * The public origin (no trailing slash; an empty value counts as unset) and whether search engines may index the site.
 * Only `VITE_SITE_ENV=production` is indexable: unset, empty or anything else, `Production` included, is not.
 */
export function readSiteConfig(env: SiteEnv = import.meta.env): { siteUrl: string, indexable: boolean } {
  const siteUrl = (env.VITE_SITE_URL || DEFAULT_SITE_URL).replace(TRAILING_SLASHES, '')

  return { siteUrl, indexable: env.VITE_SITE_ENV === 'production' }
}

/** noindex on every response outside production, except `robots.txt` and `sitemap.xml`, which crawlers must be able to read. */
export function seoHeaders(pathname: string, indexable: boolean): Record<string, string> {
  if (indexable || CRAWLER_FILES.includes(pathname.toLowerCase()))
    return {}

  return { [ROBOTS_TAG]: 'noindex' }
}

/**
 * Runs `next` and sets the noindex header on the response it yields, unless one is already set. In start.ts the
 * private-area middleware is the outer one: this one sets its header first and the private one then overwrites it with `set`,
 * so the guard only protects a header set further in (by a route or by Start). A Response thrown by `next` passes through untouched.
 */
export async function withSeoHeaders<T extends { response: Response }>(pathname: string, indexable: boolean, next: () => T | Promise<T>): Promise<T> {
  const result = await next()

  for (const [name, value] of Object.entries(seoHeaders(pathname, indexable))) {
    if (!result.response.headers.has(name))
      result.response.headers.set(name, value)
  }

  return result
}
