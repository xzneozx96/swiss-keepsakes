import { createMiddleware, createStart } from '@tanstack/react-start'

import { readSiteConfig, withSeoHeaders } from '@/features/seo/lib/site-config'
import { withPrivateHeaders } from '@/lib/private-routes'

/**
 * Sets the private-area headers on the responses that reach request middleware: pages, 404s, router redirects and errors thrown while rendering (ADR-001).
 * `privateHeaders` compares the path the way the router does (without case, each valid %XX decoded), so `/Partner/<token>` gets them too.
 * Two responses come from Start before any request middleware runs and are not covered here. A path that starts with two or more slashes or a backslash (`//partner/x`, `/\partner/x`) gets a 308; its target is covered. A path with a malformed `%` escape (`/partner/x%E0`) gets a bodyless 400, with no headers.
 */
const privateHeadersMiddleware = createMiddleware().server(({ next, request }) =>
  withPrivateHeaders(new URL(request.url).pathname, next))

/** Outside production (`VITE_SITE_ENV` is not `production`) every response carries `X-Robots-Tag: noindex`, except `robots.txt` and `sitemap.xml`. */
const seoHeadersMiddleware = createMiddleware().server(({ next, request }) =>
  withSeoHeaders(new URL(request.url).pathname, readSiteConfig().indexable, next))

// Routes stay client-only until a route opts in with `ssr: true`; the root and the public routes do.
// (Start reads `defaultSsr` here, not from the router options.)
export const startInstance = createStart(() => ({
  defaultSsr: false,
  requestMiddleware: [privateHeadersMiddleware, seoHeadersMiddleware],
}))
