import { defineHandler } from 'nitro/h3'

import { privateHeaders } from '@/lib/private-routes'

/**
 * Nitro route rules match case-sensitively but the router does not, so `/Partner/<token>` would skip a rule.
 * This middleware runs on every request and sets the private-area headers from `privateHeaders`, which compares
 * the path the way the router does: without case and with each valid %XX decoded (ADR-001).
 * h3 sends `res.headers` on a success and `res.errHeaders` on a response with status 400 or more, so both get the values.
 */
export default defineHandler((event) => {
  for (const [name, value] of Object.entries(privateHeaders(event.url.pathname))) {
    event.res.headers.set(name, value)
    event.res.errHeaders?.set(name, value)
  }
})
