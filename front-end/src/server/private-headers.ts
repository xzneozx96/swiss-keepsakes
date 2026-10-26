import { defineHandler } from 'nitro/h3'

import { privateHeaders } from '@/lib/private-routes'

/**
 * Nitro route rules match case-sensitively but the router does not, so `/Partner/<token>` would skip a rule.
 * This middleware runs on every request and sets the private-area headers from the same path check the router sees (ADR-001).
 */
export default defineHandler((event) => {
  for (const [name, value] of Object.entries(privateHeaders(event.url.pathname)))
    event.res.headers.set(name, value)
})
