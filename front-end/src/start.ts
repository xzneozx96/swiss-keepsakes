import { createMiddleware, createStart } from '@tanstack/react-start'

import { privateHeaders } from '@/lib/private-routes'

/**
 * Sets the private-area headers on every response Start produces: pages, 404s and router redirects (ADR-001).
 * `privateHeaders` compares the path the way the router does (without case, each valid %XX decoded), so `/Partner/<token>` gets them too.
 * The protocol-relative 308 (`//partner/x`) is answered before any request middleware runs and is not covered here.
 */
const privateHeadersMiddleware = createMiddleware().server(async ({ next, request }) => {
  const result = await next()
  for (const [name, value] of Object.entries(privateHeaders(new URL(request.url).pathname)))
    result.response.headers.set(name, value)
  return result
})

// Routes stay client-only until a route opts in with `ssr: true`; the root and the public routes do.
// (Start reads `defaultSsr` here, not from the router options.)
export const startInstance = createStart(() => ({
  defaultSsr: false,
  requestMiddleware: [privateHeadersMiddleware],
}))
