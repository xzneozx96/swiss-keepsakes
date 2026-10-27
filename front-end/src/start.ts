import { createMiddleware, createStart } from '@tanstack/react-start'

import { withPrivateHeaders } from '@/lib/private-routes'

/**
 * Sets the private-area headers on every response Start produces: pages, 404s and router redirects (ADR-001).
 * `privateHeaders` compares the path the way the router does (without case, each valid %XX decoded), so `/Partner/<token>` gets them too.
 * A path that starts with two or more slashes or a backslash (`//partner/x`, `/\partner/x`) gets a 308 before any request middleware runs and is not covered here; its target is.
 */
const privateHeadersMiddleware = createMiddleware().server(({ next, request }) =>
  withPrivateHeaders(new URL(request.url).pathname, next))

// Routes stay client-only until a route opts in with `ssr: true`; the root and the public routes do.
// (Start reads `defaultSsr` here, not from the router options.)
export const startInstance = createStart(() => ({
  defaultSsr: false,
  requestMiddleware: [privateHeadersMiddleware],
}))
