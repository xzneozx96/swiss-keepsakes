import { createFileRoute } from '@tanstack/react-router'

import { referralLocation } from '@/lib/referral-target'

/**
 * Public referral link /r/{code} (AC24): a server-only route that answers 302 to the shared page, with no screen first.
 * The code is never read, so a known and an unknown code get the same answer. Recording the visit returns with E8.3.
 * `X-Robots-Tag: noindex` comes from the request middleware in `src/start.ts`.
 */
export const Route = createFileRoute('/r/$code')({
  server: {
    handlers: {
      GET: ({ request }) =>
        new Response(null, {
          status: 302,
          headers: {
            'Location': referralLocation(request),
            'Cache-Control': 'private, no-store',
            'Vary': 'Cookie, Accept-Language',
          },
        }),
    },
  },
})
